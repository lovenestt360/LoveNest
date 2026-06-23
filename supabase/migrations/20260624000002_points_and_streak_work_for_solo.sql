-- ══════════════════════════════════════════════════════════════════════
-- FIX: utilizadores em modo solo nunca ganhavam pontos nem sequência
--
-- Duas funções tinham um gate "v_total >= 2" que saía sem fazer nada
-- para espaços com 1 membro:
--   1. update_streak           — saía logo no início (v_members < 2)
--      sem nunca incrementar streak_count nem dar os +10 pontos/dia.
--   2. checkMissionCompletion  — só atribuía os pontos de recompensa de
--      uma missão quando v_total_members >= 2, mesmo já tendo todos os
--      membros existentes (1, em modo solo) completado essa missão.
--
-- Consequência visível: Ranking Global (/ranking, não escondido em modo
-- solo) mostrava sempre 0 pontos e 0 sequência para esses utilizadores,
-- por mais activos que fossem.
--
-- Correcção: tratar "1 membro" como "todos completaram", tal como já foi
-- feito em log_daily_activity nesta mesma sessão. Para casais (2 membros)
-- o comportamento fica exactamente igual a antes.
-- ══════════════════════════════════════════════════════════════════════

-- ──────────────────────────────────────────────────────────────────────
-- 1) update_streak — permite incrementar/pontuar com 1 membro
-- ──────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.update_streak(p_couple_space_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today       DATE := CURRENT_DATE;
  v_today_count INT;
  v_members     INT;
  v_last_date   DATE;
  v_current     INT;
  v_longest     INT;
  v_shields     INT;
  v_gap         INT;
  v_new_streak  INT;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext(p_couple_space_id::TEXT));

  SELECT COUNT(*) INTO v_members
  FROM public.members WHERE couple_space_id = p_couple_space_id;
  IF v_members < 1 THEN RETURN; END IF;

  -- Load current streak state BEFORE checking today's activity.
  -- This allows break detection to run regardless of whether anyone has checked in.
  SELECT COALESCE(streak_count, 0), last_streak_date, COALESCE(longest_streak, 0)
  INTO v_current, v_last_date, v_longest
  FROM public.couple_spaces WHERE id = p_couple_space_id FOR UPDATE;
  IF NOT FOUND THEN RETURN; END IF;
  IF v_last_date = v_today THEN RETURN; END IF;

  -- ── Eager break detection ─────────────────────────────────────────────────
  -- Runs on every refresh, not just when both users are active.
  -- Only breaks when gap > available shields; otherwise fall through to
  -- existing increment+shield logic that runs when both users check in.
  IF v_current > 0
     AND v_last_date IS NOT NULL
     AND v_last_date < (v_today - INTERVAL '1 day')::DATE
  THEN
    v_gap := GREATEST((v_today - v_last_date) - 1, 0);

    SELECT COALESCE(shields, 0) INTO v_shields
    FROM public.love_shields WHERE couple_space_id = p_couple_space_id;

    IF COALESCE(v_shields, 0) < v_gap THEN
      -- Shields cannot cover the gap: streak is broken now.
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
    -- Shields sufficient: do NOT consume here.
    -- get_streak() will consume shields and update last_streak_date to yesterday,
    -- so the next update_streak call (on check-in) sees gap=0 and increments cleanly.
  END IF;

  -- ── Increment gate: all current members must be active today ─────────────
  -- (v_members = 1 em modo solo, logo basta o próprio utilizador.)
  SELECT COUNT(DISTINCT user_id) INTO v_today_count
  FROM public.daily_activity
  WHERE couple_space_id = p_couple_space_id AND activity_date = v_today;
  IF v_today_count < v_members THEN RETURN; END IF;

  -- Recalculate gap (last_streak_date may have been updated to yesterday by get_streak)
  v_gap := CASE
    WHEN v_last_date IS NULL THEN 0
    ELSE GREATEST((v_today - v_last_date) - 1, 0)
  END;

  IF v_gap = 0 THEN
    -- Consecutive day: increment streak
    v_new_streak := v_current + 1;
    UPDATE public.couple_spaces
    SET streak_count     = v_new_streak,
        last_streak_date = v_today,
        longest_streak   = GREATEST(COALESCE(longest_streak, 0), v_new_streak)
    WHERE id = p_couple_space_id;

  ELSIF v_gap >= 1 THEN
    -- Gap with sufficient shields (insufficient case already returned above)
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
      -- get_streak may have already consumed shields and updated last_streak_date to yesterday.
      -- In that case v_gap should be 0 above. Safety fallback: treat as day 1.
      UPDATE public.couple_spaces
      SET streak_count     = 1,
          last_streak_date = v_today
      WHERE id = p_couple_space_id;
    END IF;
  END IF;

  -- +10 points for a complete day
  INSERT INTO public.points (couple_space_id, total_points)
  VALUES (p_couple_space_id, 10)
  ON CONFLICT (couple_space_id)
  DO UPDATE SET total_points = public.points.total_points + 10, updated_at = now();

END;
$$;

GRANT EXECUTE ON FUNCTION public.update_streak(UUID) TO authenticated;

-- ──────────────────────────────────────────────────────────────────────
-- 2) checkMissionCompletion — premeia missão concluída com 1 membro
-- ──────────────────────────────────────────────────────────────────────

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
  v_mission         RECORD;
  v_user_count      BIGINT;
  v_total_members   INT;
  v_completed_count BIGINT;
  v_points          INT;
BEGIN
  SELECT COUNT(*) INTO v_total_members
  FROM public.members
  WHERE couple_space_id = p_couple_space_id;

  FOR v_mission IN
    SELECT lm.id, lm.mission_type, lm.target_count,
           COALESCE(lm.reward_points, 10) AS reward_points
    FROM public.couple_daily_missions cdm
    JOIN public.love_missions lm ON cdm.mission_id = lm.id
    WHERE cdm.couple_space_id = p_couple_space_id
      AND cdm.assignment_date = CURRENT_DATE
      AND (p_action_type IS NULL OR lm.mission_type = p_action_type)
  LOOP
    -- Quantas vezes o utilizador actual fez esta actividade hoje
    SELECT COUNT(*) INTO v_user_count
    FROM public.daily_activity
    WHERE user_id         = p_user_id
      AND couple_space_id = p_couple_space_id
      AND type            = v_mission.mission_type
      AND activity_date   = CURRENT_DATE;

    -- Utilizador completou a sua parte da missão?
    IF v_user_count >= COALESCE(v_mission.target_count, 1) THEN

      -- Registar conclusão individual (idempotente)
      INSERT INTO public.mission_completions
        (user_id, mission_id, couple_space_id, completed_at)
      VALUES
        (p_user_id, v_mission.id, p_couple_space_id, CURRENT_DATE)
      ON CONFLICT (user_id, mission_id, completed_at) DO NOTHING;

      -- Quantos membros distintos completaram esta missão hoje?
      SELECT COUNT(DISTINCT mc.user_id) INTO v_completed_count
      FROM public.mission_completions mc
      WHERE mc.mission_id      = v_mission.id
        AND mc.couple_space_id = p_couple_space_id
        AND mc.completed_at    = CURRENT_DATE;

      -- Se TODOS os membros actuais completaram E pontos ainda não foram atribuídos
      -- (v_total_members = 1 em modo solo, logo basta o próprio utilizador)
      IF v_completed_count >= v_total_members AND v_total_members >= 1 THEN
        v_points := v_mission.reward_points;

        -- Tentar registar o prémio (falha silenciosamente se já existir)
        INSERT INTO public.couple_mission_rewards
          (couple_space_id, mission_id, reward_date, points_awarded)
        VALUES
          (p_couple_space_id, v_mission.id, CURRENT_DATE, v_points)
        ON CONFLICT (couple_space_id, mission_id, reward_date) DO NOTHING;

        -- Só atribui pontos se o INSERT acima foi efectivo (não conflito)
        IF FOUND THEN
          INSERT INTO public.points (couple_space_id, total_points)
          VALUES (p_couple_space_id, v_points)
          ON CONFLICT (couple_space_id)
          DO UPDATE SET
            total_points = public.points.total_points + v_points,
            updated_at   = now();
        END IF;
      END IF;
    END IF;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.checkMissionCompletion(UUID, UUID, TEXT) TO authenticated;

NOTIFY pgrst, 'reload schema';
SELECT 'pontos e sequencia agora funcionam em modo solo ✓' AS resultado;
