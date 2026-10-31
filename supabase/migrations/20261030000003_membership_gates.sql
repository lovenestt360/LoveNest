-- Fecho da vistoria de 30/10 — funções que aceitam uma casa (ou um parceiro)
-- e não confirmavam que quem chama lhe pertence.
--
-- 1. Repõe o fecho de award_lovepoints / grant_lovepoints_once. A migração
--    20261030000000 deu EXECUTE a authenticated em todas as funções SECURITY
--    DEFINER e reabriu estas duas, que 20261028000003 tinha fechado de
--    propósito (o browser voltava a poder dar pontos a si próprio).
--
-- 2. "Porta" de pertença: cada função da lista é renomeada para
--    <nome>__sem_porta (fica só para o servidor) e no seu lugar fica uma
--    função com a mesma assinatura que verifica a casa e chama a original.
--    Assim não se reescreve o corpo que está em produção — que pode diferir
--    do repositório. Passam: membros da casa, admins e chamadas sem
--    utilizador (cron, service_role). Os restantes recebem 42501.
--
-- Idempotente. Aplicar à mão no SQL Editor do Supabase.

-- ── 1 ─────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  f text;
BEGIN
  FOREACH f IN ARRAY ARRAY[
    'public.award_lovepoints(uuid, integer, text, text, uuid)',
    'public.grant_lovepoints_once(uuid, uuid, integer, text, text, uuid)'
  ] LOOP
    IF to_regprocedure(f) IS NOT NULL THEN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', f);
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', f);
    END IF;
  END LOOP;
END $$;

-- ── 2 ─────────────────────────────────────────────────────────────────────
DO $do$
DECLARE
  r       record;
  v_impl  text;
  v_call  text;
  v_guard text;
  v_body  text;
BEGIN
  FOR r IN
    SELECT p.oid, p.proname, p.pronargs, p.proretset, p.proargmodes, p.proargnames,
           oidvectortypes(p.proargtypes)             AS ident,
           pg_get_function_arguments(p.oid)          AS args,
           pg_get_function_result(p.oid)             AS res
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef
      AND p.proname = ANY (ARRAY[
        'buy_guardian_item', 'set_guardian_appearance',
        'fn_buy_loveshield', 'fn_get_shields',
        'record_perfect_day', 'update_streak', 'get_streak', 'log_daily_activity',
        'fn_get_or_create_daily_missions_v5', 'checkmissioncompletion',
        'get_lifetime_points', 'get_ranking_snapshot', 'get_couple_activity_summary',
        'get_partner_cycle_summary'
      ])
  LOOP
    v_impl := r.proname || '__sem_porta';

    -- Já tem porta (corrida anterior desta migração).
    IF to_regprocedure(format('public.%I(%s)', v_impl, r.ident)) IS NOT NULL THEN
      CONTINUE;
    END IF;

    IF r.proargmodes IS NOT NULL AND NOT r.proretset AND 'o' = ANY (r.proargmodes) THEN
      RAISE NOTICE 'Ignorada (parâmetros OUT): %(%)', r.proname, r.ident;
      CONTINUE;
    END IF;

    IF r.proname = 'get_partner_cycle_summary' THEN
      v_guard := 'auth.uid() IS NOT NULL AND $1 IS DISTINCT FROM auth.uid() '
              || 'AND NOT public.is_admin() AND NOT public.are_users_in_same_couple_space($1)';
    ELSIF r.pronargs >= 1 AND r.proargnames[1] ~ '^_?p?_?couple(_space)?_id$' THEN
      v_guard := 'auth.uid() IS NOT NULL AND NOT public.is_admin() '
              || 'AND NOT public.is_member_of_couple_space($1)';
    ELSE
      RAISE NOTICE 'Ignorada (1.º argumento não é a casa): %(%)', r.proname, r.ident;
      CONTINUE;
    END IF;

    SELECT string_agg('$' || i, ', ' ORDER BY i) INTO v_call
    FROM generate_series(1, r.pronargs) AS i;
    v_call := coalesce(v_call, '');

    v_body := CASE
      WHEN r.proretset    THEN format('RETURN QUERY SELECT * FROM public.%I(%s);', v_impl, v_call)
      WHEN r.res = 'void' THEN format('PERFORM public.%I(%s);', v_impl, v_call)
      ELSE                     format('RETURN public.%I(%s);', v_impl, v_call)
    END;

    EXECUTE format('ALTER FUNCTION public.%I(%s) RENAME TO %I', r.proname, r.ident, v_impl);
    EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%I(%s) FROM PUBLIC, anon, authenticated', v_impl, r.ident);
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.%I(%s) TO service_role', v_impl, r.ident);

    EXECUTE format(
      $f$CREATE FUNCTION public.%I(%s) RETURNS %s
         LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
         AS $porta$
         BEGIN
           IF %s THEN
             RAISE EXCEPTION 'Sem acesso a esta casa' USING ERRCODE = '42501';
           END IF;
           %s
         END
         $porta$ $f$,
      r.proname, r.args, r.res, v_guard, v_body);

    EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%I(%s) FROM PUBLIC, anon', r.proname, r.ident);
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.%I(%s) TO authenticated, service_role', r.proname, r.ident);

    RAISE NOTICE 'Porta criada: %(%)', r.proname, r.ident;
  END LOOP;
END $do$;

NOTIFY pgrst, 'reload schema';

-- Verificação: deve listar cada função com a sua __sem_porta ao lado.
SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') AS browser_pode
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND (p.proname LIKE '%\_\_sem\_porta' OR p.proname IN (
       'buy_guardian_item', 'set_guardian_appearance', 'fn_buy_loveshield', 'fn_get_shields',
       'record_perfect_day', 'update_streak', 'get_streak', 'log_daily_activity',
       'fn_get_or_create_daily_missions_v5', 'checkmissioncompletion',
       'get_lifetime_points', 'get_ranking_snapshot', 'get_couple_activity_summary',
       'get_partner_cycle_summary', 'award_lovepoints', 'grant_lovepoints_once'))
ORDER BY 1;
