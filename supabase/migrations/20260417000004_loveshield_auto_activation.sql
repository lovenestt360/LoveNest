-- ══════════════════════════════════════════════════════════════════════
-- LOVESHIELD AUTO-ACTIVATION V2 (CORRIGIDO)
-- Compatível com: streaks (couple_id) + points/love_shields (couple_space_id)
-- ══════════════════════════════════════════════════════════════════════

-- 1. Coluna para rastrear uso de shield
ALTER TABLE public.streaks
ADD COLUMN IF NOT EXISTS shield_used_at TIMESTAMPTZ;


-- ──────────────────────────────────────────────────────────────────────
-- 2. UPDATE STREAK (com shield automático)
-- ──────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.update_streak(p_couple_id UUID)
RETURNS VOID AS $$
DECLARE
  v_today       DATE := CURRENT_DATE;
  v_today_count INT;
  v_members     INT;
  v_last_date   DATE;
  v_current     INT;
  v_longest     INT;
  v_shields     INT;
  v_gap         INT;
BEGIN
  -- 🔒 Lock por casal
  PERFORM pg_advisory_xact_lock(hashtext(p_couple_id::TEXT));

  -- 👥 Membros activos
  v_members := public.fn_count_active_members(p_couple_id);
  IF v_members < 2 THEN RETURN; END IF;

  -- 📊 Atividade hoje
  SELECT COUNT(DISTINCT user_id)
  INTO v_today_count
  FROM public.daily_activity
  WHERE couple_id = p_couple_id
    AND activity_date = v_today;

  IF v_today_count < v_members THEN RETURN; END IF;

  -- 📌 Estado actual
  SELECT last_active_date, current_streak, longest_streak
  INTO v_last_date, v_current, v_longest
  FROM public.streaks
  WHERE couple_id = p_couple_id
  FOR UPDATE;

  -- 🔐 Proteção NULL
  v_current := COALESCE(v_current, 0);
  v_longest := COALESCE(v_longest, 0);

  -- 🆕 Primeira vez
  IF NOT FOUND THEN
    INSERT INTO public.streaks
      (couple_id, current_streak, longest_streak, last_active_date, status, updated_at)
    VALUES
      (p_couple_id, 1, 1, v_today, 'active', now())
    ON CONFLICT (couple_id) DO NOTHING;

    INSERT INTO public.points (couple_space_id, total_points)
    VALUES (p_couple_id, 10)
    ON CONFLICT (couple_space_id)
    DO UPDATE SET total_points = public.points.total_points + 10,
                  updated_at = now();
    RETURN;
  END IF;

  -- 🔁 Já processado hoje
  IF v_last_date = v_today THEN RETURN; END IF;

  -- 📅 Gap
  v_gap := COALESCE((v_today - v_last_date) - 1, 0);

  -- ═══════════════════════════════════════
  -- ✅ CASO 1: CONSECUTIVO
  -- ═══════════════════════════════════════
  IF v_gap = 0 THEN
    v_current := v_current + 1;
    v_longest := GREATEST(v_longest, v_current);

    UPDATE public.streaks
    SET current_streak   = v_current,
        longest_streak   = v_longest,
        last_active_date = v_today,
        status           = 'active',
        updated_at       = now()
    WHERE couple_id = p_couple_id;

  -- ═══════════════════════════════════════
  -- ⚡ CASO 2: GAP = 1 (SHIELD)
  -- ═══════════════════════════════════════
  ELSIF v_gap = 1 THEN

    SELECT COALESCE(shields, 0)
    INTO v_shields
    FROM public.love_shields
    WHERE couple_space_id = p_couple_id;

    IF v_shields > 0 THEN
      -- 🛡️ USAR SHIELD
      UPDATE public.love_shields
      SET shields    = GREATEST(shields - 1, 0),
          updated_at = now()
      WHERE couple_space_id = p_couple_id;

      v_current := v_current + 1;
      v_longest := GREATEST(v_longest, v_current);

      UPDATE public.streaks
      SET current_streak   = v_current,
          longest_streak   = v_longest,
          last_active_date = v_today,
          status           = 'active',
          shield_used_at   = now(),
          updated_at       = now()
      WHERE couple_id = p_couple_id;

    ELSE
      -- 💔 QUEBRA
      v_longest := GREATEST(v_longest, 1);

      UPDATE public.streaks
      SET current_streak   = 1,
          longest_streak   = v_longest,
          last_active_date = v_today,
          status           = 'broken',
          updated_at       = now()
      WHERE couple_id = p_couple_id;
    END IF;

  -- ═══════════════════════════════════════
  -- 💔 CASO 3: GAP > 1
  -- ═══════════════════════════════════════
  ELSE
    v_longest := GREATEST(v_longest, 1);

    UPDATE public.streaks
    SET current_streak   = 1,
        longest_streak   = v_longest,
        last_active_date = v_today,
        status           = 'broken',
        updated_at       = now()
    WHERE couple_id = p_couple_id;
  END IF;

  -- 💰 Pontos (+10 sempre)
  INSERT INTO public.points (couple_space_id, total_points)
  VALUES (p_couple_id, 10)
  ON CONFLICT (couple_space_id)
  DO UPDATE SET total_points = public.points.total_points + 10,
                updated_at = now();

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ──────────────────────────────────────────────────────────────────────
-- 3. GET STREAK (com shields)
-- ──────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_streak(p_couple_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_result   JSONB;
  v_today    DATE := CURRENT_DATE;
  v_active   INT;
  v_total    INT;
  v_shields  INT := 0;
BEGIN
  SELECT COUNT(DISTINCT user_id)
  INTO v_active
  FROM public.daily_activity
  WHERE couple_id = p_couple_id
    AND activity_date = v_today;

  v_total := public.fn_count_active_members(p_couple_id);

  SELECT COALESCE(shields, 0)
  INTO v_shields
  FROM public.love_shields
  WHERE couple_space_id = p_couple_id;

  SELECT jsonb_build_object(
    'current', COALESCE(s.current_streak, 0),
    'longest', COALESCE(s.longest_streak, 0),
    'status', COALESCE(s.status, 'active'),
    'last_date', s.last_active_date,

    'both_active_today', (v_active >= v_total AND v_total >= 2),
    'active_today_count', v_active,
    'total_members', v_total,

    'shields_remaining', v_shields,
    'shield_used_today',
      (s.shield_used_at::DATE = v_today AND s.shield_used_at IS NOT NULL),

    'progress_percentage',
      LEAST(ROUND((COALESCE(s.current_streak, 0)::NUMERIC / 28) * 100), 100),

    'streak_at_risk',
      (v_active < v_total AND s.last_active_date = (v_today - INTERVAL '1 day')::DATE)

  )
  INTO v_result
  FROM public.streaks s
  WHERE s.couple_id = p_couple_id;

  RETURN COALESCE(v_result, jsonb_build_object(
    'current', 0,
    'longest', 0,
    'status', 'active',
    'both_active_today', false,
    'active_today_count', v_active,
    'total_members', v_total,
    'progress_percentage', 0,
    'streak_at_risk', false,
    'shields_remaining', v_shields,
    'shield_used_today', false
  ));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 🔄 Reload
NOTIFY pgrst, 'reload schema';

SELECT 'Loveshield V2 corrigido e pronto ✓' AS resultado;
