-- Vistoria de segurança do LoveNest, parte 2 — SÓ LEITURA (não altera nada).
-- Correr no Supabase → SQL Editor e copiar o resultado.
SELECT json_build_object(
  'tables_without_rls', (
    SELECT json_agg(c.relname ORDER BY c.relname)
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r' AND NOT c.relrowsecurity
  ),
  'definer_functions_anon_can_run', (
    SELECT json_agg(p.proname ORDER BY p.proname)
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef AND has_function_privilege('anon', p.oid, 'EXECUTE')
  ),
  'couple_spaces_update_columns', (
    SELECT json_agg(column_name ORDER BY column_name) FROM information_schema.column_privileges
    WHERE table_schema = 'public' AND table_name = 'couple_spaces' AND grantee = 'authenticated' AND privilege_type = 'UPDATE'
  ),
  'migration_markers', (
    SELECT json_object_agg(x, EXISTS (
      SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = x))
    FROM unnest(ARRAY['activate_trial', 'admin_approve_payment', 'activate_paid_subscription', 'expire_due_subscriptions',
                      'normalize_client_payment_insert', 'normalize_client_book_purchase', 'claim_push_token',
                      'create_couple_space', 'join_couple_space', 'grant_lovepoints_once']) x
  ),
  'is_admin', (
    SELECT pg_get_functiondef(p.oid) FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'is_admin' LIMIT 1
  )
) AS vistoria_2;
