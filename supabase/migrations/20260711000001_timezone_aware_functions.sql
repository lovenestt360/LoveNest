-- ══════════════════════════════════════════════════════════════════════
-- Timezone-aware streak & mission functions
--
-- Problema: todas as funções usavam CURRENT_DATE (UTC no Supabase).
-- Utilizadores em UTC+ (ex: Moçambique UTC+2) viam o "novo dia" começar
-- às 02h00 local em vez da meia-noite — streak e missões não reiniciavam
-- à hora certa.
--
-- Solução: cada função lê profiles.timezone do utilizador actual
-- (auth.uid()) e usa (NOW() AT TIME ZONE v_user_tz)::DATE como "hoje".
-- Se a timezone estiver nula ou vazia, fica 'UTC' como fallback seguro.
-- O hook useProfile actualiza profiles.timezone a partir do browser
-- automaticamente no arranque da app.
--
-- Funções actualizadas:
--   1. log_daily_activity
--   2. update_streak
--   3. get_streak
--   4. checkMissionCompletion
--   5. fn_get_or_create_daily_missions_v5
-- ══════════════════════════════════════════════════════════════════════

-- ── Helper inline: lê timezone do utilizador actual ──────────────────
-- Usado em todos os blocos abaixo.

-- ── 1. log_daily_activity ─────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.log_daily_activity(
  p_couple_space_id UUID,
  p_type            TEXT DEFAULT 'general'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_user_tz TEXT;
  v_today   DATE;
  v_active  INT  := 0;
  v_total   INT  := 0;
  v_streak  INT  := 0;
  v_last    DATE;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'status', 'unauthenticated');
  END IF;

  -- Ler timezone do perfil; fallback para UTC se nula/vazia
  SELECT COALESCE(NULLIF(TRIM(COALESCE(timezone, '')), ''), 'UTC')
  INTO v_user_tz
  FROM public.profiles WHERE user_id = v_user_id LIMIT 1;
  IF v_user_tz IS NULL THEN v_user_tz := 'UTC'; END IF;
  v_today := (NOW() AT TIME ZONE v_user_tz)::DATE;

  IF NOT EXISTS (
    SELECT 1 FROM public.members
    WHERE couple_space_id = p_couple_space_id AND user_id = v_user_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'status', 'invalid_user');
  END IF;

  -- Regista o tipo específico (ex: 'mood', 'prayer', 'message')
  INSERT INTO public.daily_activity (couple_space_id, user_id, activity_date, type)
  VALUES (p_couple_space_id, v_user_id, v_today, p_type)
  ON CONFLICT (couple_space_id, user_id, activity_date, type) DO NOTHING;

  -- Qualquer actividade conta também como check-in (presença do dia)
  IF p_type <> 'checkin' THEN
    INSERT INTO public.daily_activity (couple_space_id, user_id, activity_date, type)
    VALUES (p_couple_space_id, v_user_id, v_today, 'checkin')
    ON CONFLICT (couple_space_id, user_id, activity_date, type) DO NOTHING;
  END IF;

  SELECT COUNT(DISTINCT user_id) INTO v_active
  FROM public.daily_activity
  WHERE couple_space_id = p_couple_space_id
    AND activity_date   = v_today;

  SELECT COUNT(*) INTO v_total
  FROM public.members
  WHERE couple_space_id = p_couple_space_id;

  SELECT COALESCE(streak_count, 0), last_streak_date
  INTO v_streak, v_last
  FROM public.couple_spaces
  WHERE id = p_couple_space_id;

  RETURN jsonb_build_object(
    'success',           true,
    'status',            'success',
    'active_today',      v_active,
    'total_members',     v_total,
    'both_active_today', (v_active >= v_total AND v_total >= 1),
    'current_streak',    v_streak,
    'last_streak_date',  v_last
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_daily_activity(UUID, TEXT) TO authenticated;

-- ── 2. update_streak ──────────────────────────────────────────────────
-- Parâmetro único mantido (p_couple_space_id UUID) — sem quebra de API.

DROP FUNCTION IF EXISTS public.update_streak(UUID);

CREATE OR REPLACE FUNCTION public.update_streak(p_couple_space_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_tz     TEXT;
  v_today       DATE;
  v_today_count INT;
  v_members     INT;
  v_last_date   DATE;
  v_current     INT;
  v_longest     INT;
  v_shields     INT;
  v_gap         INT;
  v_new_streak  INT;
BEGIN
  SELECT COALESCE(NULLIF(TRIM(COALESCE(timezone, '')), ''), 'UTC')
  INTO v_user_tz
  FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
  IF v_user_tz IS NULL THEN v_user_tz := 'UTC'; END IF;
  v_today := (NOW() AT TIME ZONE v_user_tz)::DATE;

  PERFORM pg_advisory_xact_lock(hashtext(p_couple_space_id::TEXT));

  SELECT COUNT(*) INTO v_members
  FROM public.members WHERE couple_space_id = p_couple_space_id;
  IF v_members < 1 THEN RETURN; END IF;

  SELECT COALESCE(streak_count, 0), last_streak_date, COALESCE(longest_streak, 0)
  INTO v_current, v_last_date, v_longest
  FROM public.couple_spaces WHERE id = p_couple_space_id FOR UPDATE;
  IF NOT FOUND THEN RETURN; END IF;
  IF v_last_date = v_today THEN RETURN; END IF;

  IF v_current > 0
     AND v_last_date IS NOT NULL
     AND v_last_date < (v_today - INTERVAL '1 day')::DATE
  THEN
    v_gap := GREATEST((v_today - v_last_date) - 1, 0);

    SELECT COALESCE(shields, 0) INTO v_shields
    FROM public.love_shields WHERE couple_space_id = p_couple_space_id;

    IF COALESCE(v_shields, 0) < v_gap THEN
      IF COALESCE(v_shields, 0) > 0 THEN
        UPDATE public.love_shields
        SET shields               = 0,
            last_shield_used_date = v_today,
            updated_at            = now()
        WHERE couple_space_id = p_couple_space_id;
      END IF;

      UPDATE public.couple_spaces
      SET streak_count     = 0,
          last_streak_date = NULL
      WHERE id = p_couple_space_id;

      RETURN;
    END IF;
  END IF;

  SELECT COUNT(DISTINCT user_id) INTO v_today_count
  FROM public.daily_activity
  WHERE couple_space_id = p_couple_space_id AND activity_date = v_today;
  IF v_today_count < v_members THEN RETURN; END IF;

  v_gap := CASE
    WHEN v_last_date IS NULL THEN 0
    ELSE GREATEST((v_today - v_last_date) - 1, 0)
  END;

  IF v_gap = 0 THEN
    v_new_streak := v_current + 1;
    UPDATE public.couple_spaces
    SET streak_count     = v_new_streak,
        last_streak_date = v_today,
        longest_streak   = GREATEST(COALESCE(longest_streak, 0), v_new_streak)
    WHERE id = p_couple_space_id;

  ELSIF v_gap >= 1 THEN
    SELECT COALESCE(shields, 0) INTO v_shields
    FROM public.love_shields WHERE couple_space_id = p_couple_space_id;

    IF COALESCE(v_shields, 0) >= v_gap THEN
      UPDATE public.love_shields
      SET shields               = GREATEST(shields - v_gap, 0),
          last_shield_used_date = v_today,
          updated_at            = now()
      WHERE couple_space_id = p_couple_space_id;

      v_new_streak := v_current + 1;
      UPDATE public.couple_spaces
      SET streak_count     = v_new_streak,
          last_streak_date = v_today,
          longest_streak   = GREATEST(COALESCE(longest_streak, 0), v_new_streak)
      WHERE id = p_couple_space_id;

    ELSE
      UPDATE public.couple_spaces
      SET streak_count     = 1,
          last_streak_date = v_today
      WHERE id = p_couple_space_id;
    END IF;
  END IF;

  -- +10 LovePoints por dia completo — registado no extrato (award_lovepoints)
  PERFORM public.award_lovepoints(p_couple_space_id, 10, 'streak_diario', 'Chama mantida hoje');
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_streak(UUID) TO authenticated;

-- ── 3. get_streak ─────────────────────────────────────────────────────

DROP FUNCTION IF EXISTS public.get_streak(UUID);

CREATE OR REPLACE FUNCTION public.get_streak(p_couple_space_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_tz       TEXT;
  v_today         DATE;
  v_current       INT     := 0;
  v_last          DATE;
  v_active        INT     := 0;
  v_total         INT     := 0;
  v_shields       INT     := 0;
  v_my_checked_in BOOLEAN := FALSE;
BEGIN
  SELECT COALESCE(NULLIF(TRIM(COALESCE(timezone, '')), ''), 'UTC')
  INTO v_user_tz
  FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
  IF v_user_tz IS NULL THEN v_user_tz := 'UTC'; END IF;
  v_today := (NOW() AT TIME ZONE v_user_tz)::DATE;

  SELECT COALESCE(streak_count, 0), last_streak_date
  INTO v_current, v_last
  FROM public.couple_spaces
  WHERE id = p_couple_space_id;

  SELECT COUNT(DISTINCT user_id)
  INTO v_active
  FROM public.daily_activity
  WHERE couple_space_id = p_couple_space_id
    AND activity_date   = v_today;

  SELECT EXISTS (
    SELECT 1 FROM public.daily_activity
    WHERE couple_space_id = p_couple_space_id
      AND user_id         = auth.uid()
      AND activity_date   = v_today
  ) INTO v_my_checked_in;

  v_total := public.fn_count_active_members(p_couple_space_id);

  SELECT COALESCE(shields, 0)
  INTO v_shields
  FROM public.love_shields
  WHERE couple_space_id = p_couple_space_id;

  RETURN jsonb_build_object(
    -- Streak core
    'streak',             v_current,
    'current',            v_current,
    'current_streak',     v_current,
    'longest',            v_current,
    'longest_streak',     v_current,
    'last_date',          v_last,
    'last_active_date',   v_last,
    'last_streak_date',   v_last,

    -- Status
    'status', CASE
      WHEN v_last IS NULL                                THEN 'active'
      WHEN v_last >= (v_today - INTERVAL '1 day')::DATE THEN 'active'
      ELSE 'broken'
    END,

    -- Actividade de hoje (ambos os aliases por compatibilidade)
    'active_today',       v_active,
    'active_today_count', v_active,
    'both_active',        (v_active >= v_total AND v_total >= 2),
    'both_active_today',  (v_active >= v_total AND v_total >= 2),
    'my_checked_in',      v_my_checked_in,
    'member_count',       v_total,
    'total_members',      v_total,

    -- Shields
    'shields_remaining',            v_shields,
    'shield_used_today',            FALSE,
    'shields_purchased_this_month', 0,

    -- Gamificação
    'progress_percentage', LEAST(ROUND((v_current::NUMERIC / 28) * 100), 100),
    'streak_at_risk', (
      v_active < v_total
      AND v_total >= 2
      AND v_current > 0
      AND v_last = (v_today - INTERVAL '1 day')::DATE
    ),
    'days_since_last_activity', CASE
      WHEN v_last IS NOT NULL THEN (v_today - v_last)
      ELSE NULL
    END
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_streak(UUID) TO authenticated;

-- ── 4. checkMissionCompletion ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.checkMissionCompletion(
  p_couple_space_id UUID,
  p_user_id         UUID,
  p_action_type     TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_tz         TEXT;
  v_today           DATE;
  v_mission         RECORD;
  v_user_count      BIGINT;
  v_total_members   INT;
  v_completed_count BIGINT;
  v_points          INT;
BEGIN
  SELECT COALESCE(NULLIF(TRIM(COALESCE(timezone, '')), ''), 'UTC')
  INTO v_user_tz
  FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
  IF v_user_tz IS NULL THEN v_user_tz := 'UTC'; END IF;
  v_today := (NOW() AT TIME ZONE v_user_tz)::DATE;

  SELECT COUNT(*) INTO v_total_members
  FROM public.members
  WHERE couple_space_id = p_couple_space_id;

  FOR v_mission IN
    SELECT lm.id, lm.mission_type, lm.title, lm.target_count,
           COALESCE(lm.reward_points, 10) AS reward_points
    FROM public.couple_daily_missions cdm
    JOIN public.love_missions lm ON cdm.mission_id = lm.id
    WHERE cdm.couple_space_id = p_couple_space_id
      AND cdm.assignment_date = v_today
      AND (p_action_type IS NULL OR lm.mission_type = p_action_type)
  LOOP
    SELECT COUNT(*) INTO v_user_count
    FROM public.daily_activity
    WHERE user_id         = p_user_id
      AND couple_space_id = p_couple_space_id
      AND type            = v_mission.mission_type
      AND activity_date   = v_today;

    IF v_user_count >= COALESCE(v_mission.target_count, 1) THEN

      INSERT INTO public.mission_completions
        (user_id, mission_id, couple_space_id, completed_at)
      VALUES
        (p_user_id, v_mission.id, p_couple_space_id, v_today)
      ON CONFLICT (user_id, mission_id, completed_at) DO NOTHING;

      SELECT COUNT(DISTINCT mc.user_id) INTO v_completed_count
      FROM public.mission_completions mc
      WHERE mc.mission_id      = v_mission.id
        AND mc.couple_space_id = p_couple_space_id
        AND mc.completed_at    = v_today;

      IF v_completed_count >= v_total_members AND v_total_members >= 1 THEN
        v_points := v_mission.reward_points;

        INSERT INTO public.couple_mission_rewards
          (couple_space_id, mission_id, reward_date, points_awarded)
        VALUES
          (p_couple_space_id, v_mission.id, v_today, v_points)
        ON CONFLICT (couple_space_id, mission_id, reward_date) DO NOTHING;

        IF FOUND THEN
          PERFORM public.award_lovepoints(p_couple_space_id, v_points, v_mission.mission_type, v_mission.title);
        END IF;
      END IF;
    END IF;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.checkMissionCompletion(UUID, UUID, TEXT) TO authenticated;

-- ── 5. fn_get_or_create_daily_missions_v5 ────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_get_or_create_daily_missions_v5(p_couple_space_id UUID)
RETURNS TABLE(
  cdm_id        UUID,
  mission_id    UUID,
  title         TEXT,
  description   TEXT,
  emoji         TEXT,
  mission_type  TEXT,
  target_count  INTEGER,
  reward_points INTEGER,
  progress      BIGINT,
  completed     BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_user_tz TEXT;
  v_today   DATE;
BEGIN
  SELECT COALESCE(NULLIF(TRIM(COALESCE(timezone, '')), ''), 'UTC')
  INTO v_user_tz
  FROM public.profiles WHERE user_id = v_user_id LIMIT 1;
  IF v_user_tz IS NULL THEN v_user_tz := 'UTC'; END IF;
  v_today := (NOW() AT TIME ZONE v_user_tz)::DATE;

  -- Atribuir 4 missões para hoje se ainda não existirem
  IF NOT EXISTS (
    SELECT 1 FROM public.couple_daily_missions
    WHERE couple_space_id = p_couple_space_id
      AND assignment_date = v_today
  ) THEN
    INSERT INTO public.couple_daily_missions (couple_space_id, mission_id, assignment_date)
    SELECT p_couple_space_id, lm.id, v_today
    FROM public.love_missions lm
    ORDER BY lm.mission_type
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN QUERY
  SELECT
    cdm.id                                AS cdm_id,
    cdm.mission_id,
    lm.title,
    lm.description,
    COALESCE(lm.emoji, '')               AS emoji,
    COALESCE(lm.mission_type, 'general') AS mission_type,
    COALESCE(lm.target_count, 1)         AS target_count,
    COALESCE(lm.reward_points, 10)       AS reward_points,
    (
      SELECT LEAST(COUNT(*), lm.target_count::BIGINT)
      FROM public.daily_activity da
      WHERE da.user_id         = v_user_id
        AND da.couple_space_id = p_couple_space_id
        AND da.type            = lm.mission_type
        AND da.activity_date   = v_today
    )                                     AS progress,
    EXISTS (
      SELECT 1 FROM public.mission_completions mc
      WHERE mc.user_id      = v_user_id
        AND mc.mission_id   = cdm.mission_id
        AND mc.completed_at = v_today
    )                                     AS completed
  FROM public.couple_daily_missions cdm
  JOIN public.love_missions lm ON cdm.mission_id = lm.id
  WHERE cdm.couple_space_id = p_couple_space_id
    AND cdm.assignment_date = v_today
  ORDER BY completed ASC, lm.title;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_get_or_create_daily_missions_v5(UUID) TO authenticated;

NOTIFY pgrst, 'reload schema';
SELECT 'Funções de streak/missão agora usam timezone local do utilizador ✓' AS resultado;
