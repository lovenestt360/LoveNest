-- ══════════════════════════════════════════════════════════════════════
-- FIX: log_daily_activity ON CONFLICT
--
-- O constraint em daily_activity é:
--   UNIQUE (couple_space_id, user_id, activity_date, type)  ← 4 colunas
--
-- A função anterior usava ON CONFLICT (couple_space_id, user_id, activity_date)
--   ← 3 colunas → "no unique constraint matching" → rollback em cada check-in
--
-- Fix: usar ON CONFLICT com as 4 colunas correctas.
-- Benefício extra: permite múltiplos tipos por dia (checkin + mood + prayer).
-- ══════════════════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS public.log_daily_activity(UUID, TEXT);

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
  v_today   DATE := CURRENT_DATE;
  v_active  INT  := 0;
  v_total   INT  := 0;
  v_streak  INT  := 0;
  v_last    DATE;
BEGIN
  -- Guard: autenticação
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'status', 'unauthenticated');
  END IF;

  -- Guard: pertença ao casal
  IF NOT EXISTS (
    SELECT 1 FROM public.members
    WHERE couple_space_id = p_couple_space_id AND user_id = v_user_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'status', 'invalid_user');
  END IF;

  -- Inserção idempotente — constraint é (couple_space_id, user_id, activity_date, type)
  -- Permite múltiplos tipos por dia (checkin + mood + prayer cada um conta)
  INSERT INTO public.daily_activity (couple_space_id, user_id, activity_date, type)
  VALUES (p_couple_space_id, v_user_id, v_today, p_type)
  ON CONFLICT (couple_space_id, user_id, activity_date, type) DO NOTHING;

  -- Contar utilizadores distintos activos hoje (trigger update_streak já disparou)
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
    'both_active_today', (v_active >= v_total AND v_total >= 2),
    'current_streak',    v_streak,
    'last_streak_date',  v_last
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_daily_activity(UUID, TEXT) TO authenticated;
NOTIFY pgrst, 'reload schema';
SELECT 'log_daily_activity ON CONFLICT fixed (4 cols) ✓' AS resultado;
