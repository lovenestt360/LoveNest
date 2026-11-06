-- Recuperar a chama: depois de a perder, a casa tem 48 horas para a recuperar com LovePoints.
--  * fn_settle_streak guarda os dias perdidos em love_shields.lost_streak.
--  * fn_recover_streak paga, devolve os dias e soma os que já tiverem recomeçado.
--  * get_streak devolve "recovery" enquanto a recuperação estiver disponível.
--  * Uma recuperação por mês. O preço só está em fn_streak_recovery_cost.
-- Idempotente. Aplicar à mão no SQL Editor do Supabase, antes do merge.

BEGIN;

ALTER TABLE public.love_shields
  ADD COLUMN IF NOT EXISTS lost_streak         INT,
  ADD COLUMN IF NOT EXISTS lost_streak_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_recovery_month TEXT;

CREATE OR REPLACE FUNCTION public.fn_streak_recovery_cost()
RETURNS INT
LANGUAGE sql
IMMUTABLE
AS $$ SELECT 300 $$;

CREATE OR REPLACE FUNCTION public.fn_settle_streak(p_couple_space_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today       DATE;
  v_month       TEXT;
  v_streak      INT;
  v_last        DATE;
  v_shields     INT;
  v_replenished TEXT;
  v_day         DATE;
  v_spent       INT     := 0;
  v_broke       BOOLEAN := FALSE;
  v_event       JSONB;
  v_prior_lost  INT;
  v_prior_at    TIMESTAMPTZ;
  v_recovery    TEXT;
  v_recoverable BOOLEAN := FALSE;
  v_lost        INT;
  v_lost_at     TIMESTAMPTZ;
BEGIN
  SELECT MIN((now() AT TIME ZONE COALESCE(NULLIF(btrim(p.timezone), ''), 'UTC'))::DATE)
  INTO v_today
  FROM public.members m
  LEFT JOIN public.profiles p ON p.user_id = m.user_id
  WHERE m.couple_space_id = p_couple_space_id;
  IF v_today IS NULL THEN RETURN; END IF;
  v_month := to_char(v_today, 'YYYY-MM');

  PERFORM pg_advisory_xact_lock(hashtext(p_couple_space_id::TEXT));

  SELECT COALESCE(streak_count, 0), last_streak_date
  INTO v_streak, v_last
  FROM public.couple_spaces WHERE id = p_couple_space_id FOR UPDATE;
  IF NOT FOUND THEN RETURN; END IF;

  INSERT INTO public.love_shields (couple_space_id, shields, last_replenished_month)
  VALUES (p_couple_space_id, 3, v_month)
  ON CONFLICT (couple_space_id) DO NOTHING;

  SELECT COALESCE(shields, 0), last_replenished_month, lost_streak, lost_streak_at, last_recovery_month
  INTO v_shields, v_replenished, v_prior_lost, v_prior_at, v_recovery
  FROM public.love_shields WHERE couple_space_id = p_couple_space_id FOR UPDATE;

  v_lost := v_prior_lost;
  v_lost_at := v_prior_at;

  IF v_streak > 0 AND v_last IS NOT NULL AND v_last < v_today - 1 THEN
    v_day := v_last + 1;
    WHILE v_day < v_today LOOP
      -- Um dia em falta noutro mês usa os escudos desse mês.
      IF v_replenished IS NULL OR v_replenished < to_char(v_day, 'YYYY-MM') THEN
        v_shields := 3;
        v_replenished := to_char(v_day, 'YYYY-MM');
      END IF;

      IF v_shields <= 0 THEN
        v_broke := TRUE;
        EXIT;
      END IF;
      v_shields := v_shields - 1;
      v_spent := v_spent + 1;
      v_day := v_day + 1;
    END LOOP;

    IF v_broke THEN
      UPDATE public.couple_spaces
      SET streak_count = 0, last_streak_date = NULL
      WHERE id = p_couple_space_id;

      v_recoverable := v_recovery IS DISTINCT FROM v_month;
      -- Uma chama pequena apagada de novo não tira o direito a recuperar a maior.
      IF NOT (v_prior_lost >= v_streak AND v_prior_at > now() - INTERVAL '48 hours') THEN
        v_lost := CASE WHEN v_recoverable THEN v_streak END;
        v_lost_at := CASE WHEN v_recoverable THEN now() END;
      END IF;
    ELSE
      UPDATE public.couple_spaces
      SET last_streak_date = v_today - 1
      WHERE id = p_couple_space_id;
    END IF;
  END IF;

  -- Novo mês: volta aos 3 escudos.
  IF v_replenished IS NULL OR v_replenished < v_month THEN
    v_shields := 3;
    v_replenished := v_month;
  END IF;

  IF v_broke THEN
    v_event := jsonb_build_object('kind', 'flame_lost', 'days', v_streak, 'recoverable', v_recoverable, 'at', now());
  ELSIF v_spent > 0 THEN
    v_event := jsonb_build_object('kind', 'shield_used', 'days', v_streak, 'used', v_spent, 'left', v_shields, 'at', now());
  END IF;

  UPDATE public.love_shields
  SET shields                = v_shields,
      last_replenished_month = v_replenished,
      last_shield_used_date  = CASE WHEN v_spent > 0 AND NOT v_broke THEN v_today ELSE last_shield_used_date END,
      last_event             = COALESCE(v_event, last_event),
      lost_streak            = v_lost,
      lost_streak_at         = v_lost_at,
      updated_at             = now()
  WHERE couple_space_id = p_couple_space_id
    AND (shields IS DISTINCT FROM v_shields
         OR last_replenished_month IS DISTINCT FROM v_replenished
         OR v_event IS NOT NULL);
END;
$$;

REVOKE ALL ON FUNCTION public.fn_settle_streak(UUID) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.fn_recover_streak(p_couple_space_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cost     INT := public.fn_streak_recovery_cost();
  v_today    DATE;
  v_month    TEXT;
  v_lost     INT;
  v_lost_at  TIMESTAMPTZ;
  v_recovery TEXT;
  v_points   INT;
  v_days     INT;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_member_of_couple_space(p_couple_space_id) THEN
    RAISE EXCEPTION 'Sem acesso a esta casa' USING ERRCODE = '42501';
  END IF;

  PERFORM public.fn_settle_streak(p_couple_space_id);

  SELECT MIN((now() AT TIME ZONE COALESCE(NULLIF(btrim(p.timezone), ''), 'UTC'))::DATE)
  INTO v_today
  FROM public.members m
  LEFT JOIN public.profiles p ON p.user_id = m.user_id
  WHERE m.couple_space_id = p_couple_space_id;
  v_month := to_char(v_today, 'YYYY-MM');

  SELECT lost_streak, lost_streak_at, last_recovery_month
  INTO v_lost, v_lost_at, v_recovery
  FROM public.love_shields WHERE couple_space_id = p_couple_space_id FOR UPDATE;

  IF COALESCE(v_lost, 0) <= 0 OR v_lost_at IS NULL OR v_lost_at <= now() - INTERVAL '48 hours' THEN
    RETURN jsonb_build_object('status', 'expired');
  END IF;
  IF v_recovery = v_month THEN
    RETURN jsonb_build_object('status', 'already_recovered_this_month');
  END IF;

  SELECT COALESCE(total_points, 0) INTO v_points
  FROM public.points WHERE couple_space_id = p_couple_space_id FOR UPDATE;
  IF COALESCE(v_points, 0) < v_cost THEN
    RETURN jsonb_build_object('status', 'insufficient_points', 'missing', v_cost - COALESCE(v_points, 0));
  END IF;

  PERFORM public.award_lovepoints(p_couple_space_id, -v_cost, 'recuperar_chama', 'Chama recuperada', auth.uid());

  UPDATE public.couple_spaces
  SET streak_count     = COALESCE(streak_count, 0) + v_lost,
      last_streak_date = COALESCE(last_streak_date, v_today - 1),
      longest_streak   = GREATEST(COALESCE(longest_streak, 0), COALESCE(streak_count, 0) + v_lost)
  WHERE id = p_couple_space_id
  RETURNING streak_count INTO v_days;

  UPDATE public.love_shields
  SET lost_streak = NULL,
      lost_streak_at = NULL,
      last_recovery_month = v_month,
      updated_at = now()
  WHERE couple_space_id = p_couple_space_id;

  RETURN jsonb_build_object('status', 'ok', 'days', v_days, 'cost', v_cost, 'points_left', v_points - v_cost);
END;
$$;

REVOKE ALL ON FUNCTION public.fn_recover_streak(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_recover_streak(UUID) TO authenticated;

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
  v_lost           INT;
  v_lost_at        TIMESTAMPTZ;
  v_recovery_month TEXT;
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

  SELECT COALESCE(shields, 0), last_shield_used_date, last_purchased_month,
         lost_streak, lost_streak_at, last_recovery_month
  INTO v_shields, v_shield_used, v_last_purchased, v_lost, v_lost_at, v_recovery_month
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

    -- Recuperar a chama
    'recovery', CASE
      WHEN COALESCE(v_lost, 0) > 0
       AND v_lost_at > now() - INTERVAL '48 hours'
       AND v_recovery_month IS DISTINCT FROM to_char(v_today, 'YYYY-MM')
      THEN jsonb_build_object(
        'days',     v_lost,
        'deadline', v_lost_at + INTERVAL '48 hours',
        'cost',     public.fn_streak_recovery_cost()
      )
    END,

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
