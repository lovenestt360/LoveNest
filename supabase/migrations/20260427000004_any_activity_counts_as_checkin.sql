-- ══════════════════════════════════════════════════════════════════════
-- FIX: Qualquer actividade conta como check-in
--
-- Problema: missão "Check-in" exige type='checkin' na daily_activity.
--   Utilizador que envia mensagem → type='message' → missão não completa.
--   Utilizador que regista humor → type='mood'    → missão não completa.
--
-- Regra de negócio correcta: qualquer actividade do dia = presença do dia.
-- Solução: log_daily_activity e tr_on_message_for_missions inserem sempre
--   um registo adicional com type='checkin' (idempotente, ON CONFLICT DO NOTHING).
-- ══════════════════════════════════════════════════════════════════════

-- ──────────────────────────────────────────────────────────────────────
-- 1) log_daily_activity — qualquer actividade também regista 'checkin'
-- ──────────────────────────────────────────────────────────────────────

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
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'status', 'unauthenticated');
  END IF;

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
    'both_active_today', (v_active >= v_total AND v_total >= 2),
    'current_streak',    v_streak,
    'last_streak_date',  v_last
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_daily_activity(UUID, TEXT) TO authenticated;

-- ──────────────────────────────────────────────────────────────────────
-- 2) tr_on_message_for_missions — mensagem também regista 'checkin'
-- ──────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.tr_on_message_for_missions()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Actividade de mensagem
  INSERT INTO public.daily_activity (couple_space_id, user_id, activity_date, type)
  VALUES (NEW.couple_space_id, NEW.sender_user_id, CURRENT_DATE, 'message')
  ON CONFLICT (couple_space_id, user_id, activity_date, type) DO NOTHING;

  -- Qualquer mensagem = presença do dia (check-in)
  INSERT INTO public.daily_activity (couple_space_id, user_id, activity_date, type)
  VALUES (NEW.couple_space_id, NEW.sender_user_id, CURRENT_DATE, 'checkin')
  ON CONFLICT (couple_space_id, user_id, activity_date, type) DO NOTHING;

  RETURN NEW;
END;
$$;

NOTIFY pgrst, 'reload schema';
SELECT 'any activity counts as checkin ✓' AS resultado;
