CREATE OR REPLACE FUNCTION public.log_daily_activity(
  p_couple_id UUID,
  p_type TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_today DATE := (NOW() AT TIME ZONE 'Africa/Maputo')::DATE;
  v_streak JSON;
BEGIN
  -- 🔐 utilizador autenticado REAL
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN json_build_object('status', 'unauthenticated');
  END IF;

  -- ❌ validar se pertence ao casal
  IF NOT public.is_member_of_couple_space(p_couple_id) THEN
    RETURN json_build_object('status', 'invalid_user');
  END IF;

  -- ❌ evitar duplicação (se já fez check-in, ignoramos para não dar erro)
  IF EXISTS (
    SELECT 1
    FROM daily_activity
    WHERE couple_id = p_couple_id
      AND user_id = v_user_id
      AND type = p_type
      AND activity_date = v_today
  ) THEN
    -- 🔥 mesmo assim devolve estado atualizado
    SELECT public.get_streak(p_couple_id) INTO v_streak;

    RETURN json_build_object(
      'status', 'already_checked_in',
      'streak', v_streak
    );
  END IF;

  -- ✅ insert correto
  INSERT INTO daily_activity (
    couple_id,
    couple_space_id,
    user_id,
    type,
    activity_date,
    created_at
  )
  VALUES (
    p_couple_id,
    p_couple_id,
    v_user_id,
    p_type,
    v_today,
    NOW()
  );

  -- 🔥 ATUALIZAR STREAK (O ELO PERDIDO)
  -- A partir da modificação estrutural os triggers de daily_activity desapareceram
  -- Sendo imperativo chamar o calculador de fogos manualmente!
  PERFORM public.update_streak(p_couple_id);

  -- 🔥 buscar estado atualizado REAL
  SELECT public.get_streak(p_couple_id) INTO v_streak;

  RETURN json_build_object(
    'status', 'success',
    'streak', v_streak
  );

END;
$$;
