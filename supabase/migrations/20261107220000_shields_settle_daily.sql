-- Escudos: cada dia em falta gasta um escudo no próprio dia.
-- Antes só se descontava quando os dois voltavam a fazer check-in, por isso uma casa
-- parada via sempre os mesmos escudos. Agora:
--  * fn_settle_streak acerta a casa: um escudo por cada dia completo em falta; sem
--    escudos, a chama volta a 0. O dia coberto passa a contar como "último dia".
--  * corre de hora a hora (pg_cron), ao abrir a app e antes de contar um dia novo.
--  * "hoje" é o dia mais atrasado entre os membros: nunca gasta o dia de ninguém antes de acabar.
-- As funções reais são as __sem_porta (ver 20261030000003_membership_gates.sql).
-- Idempotente. Aplicar à mão no SQL Editor do Supabase.

BEGIN;

DO $$
BEGIN
  IF to_regprocedure('public.update_streak__sem_porta(uuid)') IS NULL
     OR to_regprocedure('public.get_streak__sem_porta(uuid)') IS NULL THEN
    RAISE EXCEPTION 'Falta a migração 20261030000003_membership_gates. Nada foi alterado.';
  END IF;
END $$;

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
  v_used        BOOLEAN := FALSE;
  v_broke       BOOLEAN := FALSE;
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

  SELECT COALESCE(shields, 0), last_replenished_month
  INTO v_shields, v_replenished
  FROM public.love_shields WHERE couple_space_id = p_couple_space_id FOR UPDATE;

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
      v_used := TRUE;
      v_day := v_day + 1;
    END LOOP;

    IF v_broke THEN
      UPDATE public.couple_spaces
      SET streak_count = 0, last_streak_date = NULL
      WHERE id = p_couple_space_id;
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

  UPDATE public.love_shields
  SET shields                = v_shields,
      last_replenished_month = v_replenished,
      last_shield_used_date  = CASE WHEN v_used THEN v_today ELSE last_shield_used_date END,
      updated_at             = now()
  WHERE couple_space_id = p_couple_space_id
    AND (shields IS DISTINCT FROM v_shields
         OR last_replenished_month IS DISTINCT FROM v_replenished
         OR v_used);
END;
$$;

REVOKE ALL ON FUNCTION public.fn_settle_streak(UUID) FROM PUBLIC, anon, authenticated;

-- Tarefa de hora a hora. Uma casa com erro (ex.: fuso inválido) não trava as outras.
CREATE OR REPLACE FUNCTION public.fn_settle_all_streaks()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
  v_count INTEGER := 0;
BEGIN
  FOR r IN
    SELECT id FROM public.couple_spaces
    WHERE COALESCE(streak_count, 0) > 0
      AND last_streak_date IS NOT NULL
      AND last_streak_date < CURRENT_DATE
  LOOP
    BEGIN
      PERFORM public.fn_settle_streak(r.id);
      v_count := v_count + 1;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'fn_settle_streak %: %', r.id, SQLERRM;
    END;
  END LOOP;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.fn_settle_all_streaks() FROM PUBLIC, anon, authenticated;

-- Conta o dia de hoje quando todos os membros apareceram. Os dias em falta já vêm acertados.
CREATE OR REPLACE FUNCTION public.update_streak__sem_porta(p_couple_space_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_tz     TEXT;
  v_today       DATE;
  v_today_count INT;
  v_members     INT;
  v_last_date   DATE;
BEGIN
  SELECT COALESCE(NULLIF(TRIM(COALESCE(timezone, '')), ''), 'UTC')
  INTO v_user_tz
  FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
  IF v_user_tz IS NULL THEN v_user_tz := 'UTC'; END IF;
  v_today := (NOW() AT TIME ZONE v_user_tz)::DATE;

  PERFORM public.fn_settle_streak(p_couple_space_id);

  SELECT COUNT(*) INTO v_members
  FROM public.members WHERE couple_space_id = p_couple_space_id;
  IF v_members < 1 THEN RETURN; END IF;

  SELECT last_streak_date INTO v_last_date
  FROM public.couple_spaces WHERE id = p_couple_space_id FOR UPDATE;
  IF NOT FOUND OR v_last_date = v_today THEN RETURN; END IF;

  SELECT COUNT(DISTINCT user_id) INTO v_today_count
  FROM public.daily_activity
  WHERE couple_space_id = p_couple_space_id AND activity_date = v_today;
  IF v_today_count < v_members THEN RETURN; END IF;

  UPDATE public.couple_spaces
  SET streak_count     = COALESCE(streak_count, 0) + 1,
      last_streak_date = v_today,
      longest_streak   = GREATEST(COALESCE(longest_streak, 0), COALESCE(streak_count, 0) + 1)
  WHERE id = p_couple_space_id;

  -- +10 LovePoints por dia completo — registado no extrato (award_lovepoints)
  PERFORM public.award_lovepoints(p_couple_space_id, 10, 'streak_diario', 'Chama mantida hoje');
END;
$$;

CREATE OR REPLACE FUNCTION public.get_streak__sem_porta(p_couple_space_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_tz       TEXT;
  v_today         DATE;
  v_current       INT     := 0;
  v_last          DATE;
  v_active        INT     := 0;
  v_total         INT     := 0;
  v_shields       INT     := 0;
  v_shield_used   DATE;
  v_my_checked_in BOOLEAN := FALSE;
BEGIN
  SELECT COALESCE(NULLIF(TRIM(COALESCE(timezone, '')), ''), 'UTC')
  INTO v_user_tz
  FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
  IF v_user_tz IS NULL THEN v_user_tz := 'UTC'; END IF;
  v_today := (NOW() AT TIME ZONE v_user_tz)::DATE;

  PERFORM public.fn_settle_streak(p_couple_space_id);

  SELECT COALESCE(streak_count, 0), last_streak_date
  INTO v_current, v_last
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

  SELECT COALESCE(shields, 0), last_shield_used_date
  INTO v_shields, v_shield_used
  FROM public.love_shields
  WHERE couple_space_id = p_couple_space_id;

  RETURN jsonb_build_object(
    -- Streak core
    'streak',             v_current,
    'current',            v_current,
    'current_streak',     v_current,
    'longest',            v_current,
    'longest_streak',     v_current,
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
    'shields_purchased_this_month', 0,

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

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'settle-streaks-hourly') THEN
    PERFORM cron.unschedule('settle-streaks-hourly');
  END IF;
  PERFORM cron.schedule('settle-streaks-hourly', '10 * * * *', 'SELECT public.fn_settle_all_streaks();');
END $$;

NOTIFY pgrst, 'reload schema';

COMMIT;
