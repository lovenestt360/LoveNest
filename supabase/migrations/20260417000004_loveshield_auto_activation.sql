-- ══════════════════════════════════════════════════════════════════════
-- LOVESHIELD AUTO-ACTIVATION V1
-- Lógica: quando gap = 1 dia, verificar shields antes de quebrar streak
-- Tabelas envolvidas: streaks, love_shields, points
-- ══════════════════════════════════════════════════════════════════════

-- 1. Adicionar coluna para rastrear último uso de shield no streak
ALTER TABLE public.streaks
  ADD COLUMN IF NOT EXISTS shield_used_at TIMESTAMPTZ;

-- ──────────────────────────────────────────────────────────────────────
-- 2. MOTOR: update_streak — com lógica de auto-shield
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
  -- Concorrência: lock transaccional por casal
  PERFORM pg_advisory_xact_lock(hashtext(p_couple_id::TEXT));

  -- Verificar membros activos
  v_members := public.fn_count_active_members(p_couple_id);
  IF v_members < 2 THEN RETURN; END IF;

  -- Quantos membros registaram atividade hoje
  SELECT COUNT(DISTINCT user_id) INTO v_today_count
  FROM public.daily_activity
  WHERE couple_id = p_couple_id AND activity_date = v_today;

  IF v_today_count < v_members THEN RETURN; END IF;

  -- Estado actual do streak (com row lock)
  SELECT last_active_date, current_streak, longest_streak
  INTO v_last_date, v_current, v_longest
  FROM public.streaks
  WHERE couple_id = p_couple_id
  FOR UPDATE;

  -- Primeira vez — criar streak inicial
  IF NOT FOUND THEN
    INSERT INTO public.streaks
      (couple_id, current_streak, longest_streak, last_active_date, status, updated_at)
    VALUES
      (p_couple_id, 1, 1, v_today, 'active', now())
    ON CONFLICT (couple_id) DO NOTHING;

    INSERT INTO public.points (couple_id, total_points)
    VALUES (p_couple_id, 10)
    ON CONFLICT (couple_id)
    DO UPDATE SET total_points = public.points.total_points + 10, updated_at = now();
    RETURN;
  END IF;

  -- Idempotência: já processado hoje
  IF v_last_date = v_today THEN RETURN; END IF;

  -- Calcular dias de gap (0 = consecutivo, 1 = 1 dia falhado, etc.)
  v_gap := (v_today - v_last_date) - 1;

  -- ═══════════════════════════════════════════════════════
  -- CASO 1: DIA CONSECUTIVO ✅
  -- ═══════════════════════════════════════════════════════
  IF v_gap = 0 THEN
    v_current := COALESCE(v_current, 0) + 1;
    v_longest := GREATEST(COALESCE(v_longest, 0), v_current);

    UPDATE public.streaks
    SET current_streak   = v_current,
        longest_streak   = v_longest,
        last_active_date = v_today,
        status           = 'active',
        updated_at       = now()
    WHERE couple_id = p_couple_id;

  -- ═══════════════════════════════════════════════════════
  -- CASO 2: 1 DIA FALHADO → verificar shield ⚡
  -- ═══════════════════════════════════════════════════════
  ELSIF v_gap = 1 THEN

    -- Ler saldo de shields do casal
    SELECT COALESCE(shields, 0) INTO v_shields
    FROM public.love_shields
    WHERE couple_space_id = p_couple_id;

    IF COALESCE(v_shields, 0) > 0 THEN
      -- 🛡️ SHIELD ACTIVADO: consumir e manter streak

      UPDATE public.love_shields
      SET shields    = GREATEST(shields - 1, 0),
          updated_at = now()
      WHERE couple_space_id = p_couple_id;

      v_current := COALESCE(v_current, 0) + 1;
      v_longest := GREATEST(COALESCE(v_longest, 0), v_current);

      UPDATE public.streaks
      SET current_streak   = v_current,
          longest_streak   = v_longest,
          last_active_date = v_today,
          status           = 'active',
          shield_used_at   = now(),        -- registo para UI
          updated_at       = now()
      WHERE couple_id = p_couple_id;

    ELSE
      -- 💔 SEM SHIELD: quebrar streak, recomeçar a 1

      v_longest := GREATEST(COALESCE(v_longest, 0), 1);

      UPDATE public.streaks
      SET current_streak   = 1,
          longest_streak   = v_longest,
          last_active_date = v_today,
          status           = 'broken',
          updated_at       = now()
      WHERE couple_id = p_couple_id;
    END IF;

  -- ═══════════════════════════════════════════════════════
  -- CASO 3: GAP > 1 DIA → quebra sempre (shield não cobre)
  -- ═══════════════════════════════════════════════════════
  ELSE
    v_longest := GREATEST(COALESCE(v_longest, 0), 1);

    UPDATE public.streaks
    SET current_streak   = 1,
        longest_streak   = v_longest,
        last_active_date = v_today,
        status           = 'broken',
        updated_at       = now()
    WHERE couple_id = p_couple_id;
  END IF;

  -- +10 pontos por dia completo (sempre, independente do shield)
  INSERT INTO public.points (couple_id, total_points)
  VALUES (p_couple_id, 10)
  ON CONFLICT (couple_id)
  DO UPDATE SET total_points = public.points.total_points + 10, updated_at = now();

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ──────────────────────────────────────────────────────────────────────
-- 3. get_streak — incluir shield_used_today e shields_remaining
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
  SELECT COUNT(DISTINCT user_id) INTO v_active
  FROM public.daily_activity
  WHERE couple_id = p_couple_id AND activity_date = v_today;

  v_total := public.fn_count_active_members(p_couple_id);

  -- Ler shields
  SELECT COALESCE(shields, 0) INTO v_shields
  FROM public.love_shields
  WHERE couple_space_id = p_couple_id;

  SELECT jsonb_build_object(
    -- Campos core
    'current',                  COALESCE(s.current_streak, 0),
    'current_streak',           COALESCE(s.current_streak, 0),
    'longest',                  COALESCE(s.longest_streak, 0),
    'longest_streak',           COALESCE(s.longest_streak, 0),
    'last_date',                s.last_active_date,
    'last_active_date',         s.last_active_date,
    'status',                   COALESCE(s.status, 'active'),
    'updated_at',               s.updated_at,
    -- Atividade de hoje
    'both_active_today',        (v_active >= v_total AND v_total >= 2),
    'active_today_count',       v_active,
    'total_members',            v_total,
    -- LoveShield
    'shields_remaining',        COALESCE(v_shields, 0),
    'shield_used_today',        (s.shield_used_at::DATE = v_today AND s.shield_used_at IS NOT NULL),
    -- Gamificação
    'progress_percentage',      LEAST(ROUND((COALESCE(s.current_streak, 0)::NUMERIC / 28) * 100), 100),
    'streak_at_risk',           (
      v_active < v_total
      AND s.last_active_date = (v_today - INTERVAL '1 day')::DATE
    ),
    'days_since_last_activity', CASE
      WHEN s.last_active_date IS NOT NULL THEN (v_today - s.last_active_date)
      ELSE NULL
    END
  )
  INTO v_result
  FROM public.streaks s
  WHERE s.couple_id = p_couple_id;

  RETURN COALESCE(v_result, jsonb_build_object(
    'current', 0, 'current_streak', 0, 'longest', 0, 'longest_streak', 0,
    'status', 'active', 'both_active_today', false,
    'active_today_count', v_active, 'total_members', v_total,
    'progress_percentage', 0, 'streak_at_risk', false,
    'shields_remaining', COALESCE(v_shields, 0),
    'shield_used_today', false,
    'days_since_last_activity', NULL, 'last_date', NULL, 'last_active_date', NULL
  ));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ──────────────────────────────────────────────────────────────────────
NOTIFY pgrst, 'reload schema';

SELECT 'LoveShield auto-activation + get_streak atualizado ✓' AS resultado;
