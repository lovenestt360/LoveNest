-- ══════════════════════════════════════════════════════════════════════
-- LOVESHIELD MENSAL - MÓDULO BACKEND COMPLETE
-- Inclui Tabela, Reset Automático, Consumo no update_streak, Get e Compra
-- ══════════════════════════════════════════════════════════════════════

-- 1. ALTER TABLE STREAKS (Adicionar Colunas)
ALTER TABLE public.streaks
ADD COLUMN IF NOT EXISTS shields_remaining INTEGER DEFAULT 3,
ADD COLUMN IF NOT EXISTS shields_purchased_this_month INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_shield_reset DATE DEFAULT CURRENT_DATE;

-- Atualizar resete manual para os streaks existentes caso já existam mas nulls
UPDATE public.streaks 
SET shields_remaining = 3, shields_purchased_this_month = 0, last_shield_reset = CURRENT_DATE 
WHERE last_shield_reset IS NULL;

-- 2. FUNÇÃO AUXILIAR DE RESET MENSAL (Atua passivamente)
CREATE OR REPLACE FUNCTION public.fn_ensure_monthly_shield_reset(p_couple_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_last_reset DATE;
BEGIN
  SELECT last_shield_reset INTO v_last_reset
  FROM public.streaks
  WHERE couple_id = p_couple_id;

  IF FOUND THEN
    IF EXTRACT(MONTH FROM v_last_reset) != EXTRACT(MONTH FROM CURRENT_DATE) OR
       EXTRACT(YEAR FROM v_last_reset) != EXTRACT(YEAR FROM CURRENT_DATE) THEN
       
      UPDATE public.streaks
      SET shields_remaining = 3,
          shields_purchased_this_month = 0,
          last_shield_reset = CURRENT_DATE
      WHERE couple_id = p_couple_id;
      
    END IF;
  END IF;
END;
$$;

-- 3. GET_STREAK (Atualizado para retornar dados corretos sem usar a tabela antiga love_shields)
CREATE OR REPLACE FUNCTION public.get_streak(p_couple_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result   JSONB;
  v_today    DATE := CURRENT_DATE;
  v_active   INT;
  v_total    INT;
BEGIN
  -- 1. Assegurar reset passivo sempre que pedir dados
  PERFORM public.fn_ensure_monthly_shield_reset(p_couple_id);

  SELECT COUNT(DISTINCT user_id)
  INTO v_active
  FROM public.daily_activity
  WHERE couple_id = p_couple_id
    AND activity_date = v_today;

  v_total := public.fn_count_active_members(p_couple_id);

  SELECT jsonb_build_object(
    'current', COALESCE(s.current_streak, 0),
    'longest', COALESCE(s.longest_streak, 0),
    'status', COALESCE(s.status, 'active'),
    'last_date', s.last_active_date,

    'both_active_today', (v_active >= v_total AND v_total >= 2),
    'active_today_count', v_active,
    'total_members', v_total,

    'shields_remaining', COALESCE(s.shields_remaining, 3),
    'shields_purchased_this_month', COALESCE(s.shields_purchased_this_month, 0),
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
    'shields_remaining', 3,
    'shields_purchased_this_month', 0,
    'shield_used_today', false
  ));
END;
$$;


-- 4. UPDATE_STREAK (Com Lógica do Consumo do Shield)
CREATE OR REPLACE FUNCTION public.update_streak(p_couple_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_today       DATE := CURRENT_DATE;
  v_today_count INT;
  v_members     INT;
  v_last_date   DATE;
  v_current     INT;
  v_longest     INT;
  v_gap         INT;
  v_shields_rem INT;
BEGIN
  -- Lock por casal
  PERFORM pg_advisory_xact_lock(hashtext(p_couple_id::TEXT));

  -- Assegurar o reset mensal de shields
  PERFORM public.fn_ensure_monthly_shield_reset(p_couple_id);

  v_members := public.fn_count_active_members(p_couple_id);
  IF v_members < 2 THEN RETURN; END IF;

  SELECT COUNT(DISTINCT user_id)
  INTO v_today_count
  FROM public.daily_activity
  WHERE couple_id = p_couple_id
    AND activity_date = v_today;

  IF v_today_count < v_members THEN RETURN; END IF;

  SELECT last_active_date, current_streak, longest_streak, shields_remaining
  INTO v_last_date, v_current, v_longest, v_shields_rem
  FROM public.streaks
  WHERE couple_id = p_couple_id
  FOR UPDATE;

  v_current := COALESCE(v_current, 0);
  v_longest := COALESCE(v_longest, 0);
  v_shields_rem  := COALESCE(v_shields_rem, 3);

  IF NOT FOUND THEN
    INSERT INTO public.streaks
      (couple_id, current_streak, longest_streak, last_active_date, shields_remaining, shields_purchased_this_month, last_shield_reset, status, updated_at)
    VALUES
      (p_couple_id, 1, 1, v_today, 3, 0, v_today, 'active', now())
    ON CONFLICT (couple_id) DO NOTHING;

    INSERT INTO public.points (couple_space_id, total_points)
    VALUES (p_couple_id, 10)
    ON CONFLICT (couple_space_id)
    DO UPDATE SET total_points = public.points.total_points + 10,
                  updated_at = now();
    RETURN;
  END IF;

  IF v_last_date = v_today THEN RETURN; END IF;

  v_gap := COALESCE((v_today - v_last_date) - 1, 0);

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

  ELSIF v_gap = 1 THEN

    IF v_shields_rem > 0 THEN
      -- Usa a shield
      v_current := v_current + 1;
      v_longest := GREATEST(v_longest, v_current);
      v_shields_rem := v_shields_rem - 1;

      UPDATE public.streaks
      SET current_streak    = v_current,
          longest_streak    = v_longest,
          last_active_date  = v_today,
          shields_remaining = v_shields_rem,
          shield_used_at    = now(),
          status            = 'active',
          updated_at        = now()
      WHERE couple_id = p_couple_id;
    ELSE
      -- Perde o streak (0 shields)
      UPDATE public.streaks
      SET current_streak   = 1,
          last_active_date = v_today,
          status           = 'broken',
          updated_at       = now()
      WHERE couple_id = p_couple_id;
    END IF;

  ELSE
    -- Gap > 1 -> Sempre quebra
    UPDATE public.streaks
    SET current_streak   = 1,
        last_active_date = v_today,
        status           = 'broken',
        updated_at       = now()
    WHERE couple_id = p_couple_id;
  END IF;

  -- Add 10 points for finishing day
  UPDATE public.points
  SET total_points = total_points + 10,
      updated_at   = now()
  WHERE couple_space_id = p_couple_id;

END;
$$;


-- 5. COMPRAR SHIELD EXTRA (Limites mensais e pontos)
CREATE OR REPLACE FUNCTION public.buy_monthly_shield(p_couple_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_points        INT;
  v_rem           INT;
  v_purchased     INT;
  v_cost          INT := 200;
BEGIN
  -- Garantir update passivo reset se precisar (anti-abuso se virar o mes)
  PERFORM public.fn_ensure_monthly_shield_reset(p_couple_id);

  -- Fetch current shield state
  SELECT COALESCE(shields_remaining, 0), COALESCE(shields_purchased_this_month, 0)
  INTO v_rem, v_purchased
  FROM public.streaks
  WHERE couple_id = p_couple_id;

  -- Validation: Must have 0 remaining and haven't purchased any yet.
  IF v_rem > 0 THEN
    RETURN jsonb_build_object('status', 'error_has_free_shields');
  END IF;
  
  IF v_purchased >= 1 THEN
    RETURN jsonb_build_object('status', 'error_limit_reached');
  END IF;

  -- Fetch points
  SELECT COALESCE(total_points, 0) INTO v_points
  FROM public.points
  WHERE couple_space_id = p_couple_id;

  IF v_points < v_cost THEN
    RETURN jsonb_build_object('status', 'error_insufficient_points', 'current_points', v_points);
  END IF;

  -- Consume points
  UPDATE public.points
  SET total_points = total_points - v_cost,
      updated_at   = now()
  WHERE couple_space_id = p_couple_id;

  -- Add purchased shield
  UPDATE public.streaks
  SET shields_remaining = shields_remaining + 1,
      shields_purchased_this_month = shields_purchased_this_month + 1,
      updated_at = now()
  WHERE couple_id = p_couple_id;
  
  RETURN jsonb_build_object(
    'status', 'ok',
    'shields_remaining', 1,
    'total_points', v_points - v_cost
  );

END;
$$;
