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
  v_today   DATE := (NOW() AT TIME ZONE 'Africa/Maputo')::DATE;
  v_streak  JSON;
  v_ranking JSONB;
  
  -- ✅ Variáveis para missões
  v_mission_count INT;
  v_members INT;
  v_pts INT := 0;
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

  -- ❌ evitar duplicação — mas mesmo assim devolve estado atualizado
  IF EXISTS (
    SELECT 1
    FROM daily_activity
    WHERE couple_id    = p_couple_id
      AND user_id      = v_user_id
      AND type         = p_type
      AND activity_date = v_today
  ) THEN
    SELECT public.get_streak(p_couple_id)          INTO v_streak;
    SELECT public.get_ranking_snapshot(p_couple_id) INTO v_ranking;

    RETURN json_build_object(
      'status',  'already_checked_in',
      'streak',  v_streak,
      'ranking', v_ranking
    );
  END IF;

  -- ✅ insert correto (com as duas colunas)
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

  -- 🔥 Calcular Missões em tempo real! (Se ambos completaram)
  v_members := public.fn_count_active_members(p_couple_id);
  IF v_members >= 2 THEN
    SELECT COUNT(DISTINCT user_id) INTO v_mission_count
    FROM daily_activity
    WHERE couple_id = p_couple_id AND type = p_type AND activity_date = v_today;

    IF v_mission_count = v_members THEN
       CASE p_type
         WHEN 'checkin' THEN v_pts := 10;
         WHEN 'message' THEN v_pts := 10;
         WHEN 'mood'    THEN v_pts := 5;
         WHEN 'prayer'  THEN v_pts := 5;
         ELSE v_pts := 0;
       END CASE;

       IF v_pts > 0 THEN
         UPDATE public.points 
         SET total_points = total_points + v_pts, updated_at = now() 
         WHERE couple_space_id = p_couple_id;
       END IF;
    END IF;
  END IF;

  -- 🔥 recalcular streak (trigger removido na v3 — chamada manual obrigatória)
  PERFORM public.update_streak(p_couple_id);

  -- 🔥 buscar estado REAL atualizado (streak + ranking juntos)
  SELECT public.get_streak(p_couple_id)          INTO v_streak;
  SELECT public.get_ranking_snapshot(p_couple_id) INTO v_ranking;

  RETURN json_build_object(
    'status',  'success',
    'streak',  v_streak,
    'ranking', v_ranking
  );

END;
$$;
