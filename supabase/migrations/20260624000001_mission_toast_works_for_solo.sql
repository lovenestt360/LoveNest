-- ══════════════════════════════════════════════════════════════════════
-- FIX: animação de missão concluída não aparecia em modo solo
--
-- Problema: log_daily_activity calculava both_active_today exigindo
--   v_total >= 2, ou seja, um utilizador solo (v_total = 1) nunca via
--   essa flag a true, mesmo tendo feito a sua atividade do dia. Isso é
--   consumido só por logActivity.ts no cliente para disparar o confete/
--   toast de "missão concluída" — não afeta o cálculo do streak (get_streak)
--   nem dos escudos (loveshield), que são funções separadas e ficam
--   inalteradas aqui.
--
-- Correção: both_active_today passa a significar "todos os membros
--   atuais do espaço já fizeram a atividade de hoje", o que para v_total=1
--   (solo) é verdade assim que o próprio utilizador a faz, e para v_total=2
--   (casal) mantém o comportamento exato de antes.
-- ══════════════════════════════════════════════════════════════════════

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
    'both_active_today', (v_active >= v_total AND v_total >= 1),
    'current_streak',    v_streak,
    'last_streak_date',  v_last
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_daily_activity(UUID, TEXT) TO authenticated;

NOTIFY pgrst, 'reload schema';
SELECT 'log_daily_activity: both_active_today agora funciona em modo solo ✓' AS resultado;
