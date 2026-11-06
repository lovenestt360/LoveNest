-- Jornada: get_streak passa a devolver os dois valores reais que estavam errados.
--  * "Melhor sequência": vem de couple_spaces.longest_streak, em vez da chama atual.
--  * Escudo comprado este mês: vem de love_shields.last_purchased_month, em vez de 0,
--    com o mesmo mês que fn_buy_loveshield usa para recusar a segunda compra.
-- Idempotente. Aplicar à mão no SQL Editor do Supabase.

BEGIN;

CREATE OR REPLACE FUNCTION public.get_streak__sem_porta(p_couple_space_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_tz        TEXT;
  v_today          DATE;
  v_current        INT     := 0;
  v_longest        INT     := 0;
  v_last           DATE;
  v_active         INT     := 0;
  v_total          INT     := 0;
  v_shields        INT     := 0;
  v_shield_used    DATE;
  v_last_purchased TEXT;
  v_my_checked_in  BOOLEAN := FALSE;
BEGIN
  SELECT COALESCE(NULLIF(TRIM(COALESCE(timezone, '')), ''), 'UTC')
  INTO v_user_tz
  FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
  IF v_user_tz IS NULL THEN v_user_tz := 'UTC'; END IF;
  v_today := (NOW() AT TIME ZONE v_user_tz)::DATE;

  PERFORM public.fn_settle_streak(p_couple_space_id);

  SELECT COALESCE(streak_count, 0), GREATEST(COALESCE(longest_streak, 0), COALESCE(streak_count, 0)), last_streak_date
  INTO v_current, v_longest, v_last
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

  SELECT COALESCE(shields, 0), last_shield_used_date, last_purchased_month
  INTO v_shields, v_shield_used, v_last_purchased
  FROM public.love_shields
  WHERE couple_space_id = p_couple_space_id;

  RETURN jsonb_build_object(
    -- Streak core
    'streak',             v_current,
    'current',            v_current,
    'current_streak',     v_current,
    'longest',            v_longest,
    'longest_streak',     v_longest,
    'last_date',          v_last,
    'last_active_date',   v_last,
    'last_streak_date',   v_last,

    -- Data que o servidor usou para calcular "hoje"
    'server_today',       v_today,

    -- Status
    'status', CASE
      WHEN v_last IS NULL                                THEN 'active'
      WHEN v_last >= (v_today - INTERVAL '1 day')::DATE THEN 'active'
      ELSE 'broken'
    END,

    -- Actividade de hoje
    'active_today',       v_active,
    'active_today_count', v_active,
    'both_active',        (v_active >= v_total AND v_total >= 2),
    'both_active_today',  (v_active >= v_total AND v_total >= 2),
    'my_checked_in',      v_my_checked_in,
    'member_count',       v_total,
    'total_members',      v_total,

    -- Shields
    'shields_remaining',            COALESCE(v_shields, 0),
    'shield_used_today',            COALESCE(v_shield_used = v_today, FALSE),
    'shields_purchased_this_month', CASE WHEN v_last_purchased = to_char(CURRENT_DATE, 'YYYY-MM') THEN 1 ELSE 0 END,

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

NOTIFY pgrst, 'reload schema';

COMMIT;
