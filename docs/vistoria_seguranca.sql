-- Vistoria de segurança do LoveNest — SÓ LEITURA (não altera nada).
-- Correr no Supabase → SQL Editor e copiar o resultado (uma linha JSON).
WITH
buckets AS (
  SELECT json_agg(json_build_object('id', id, 'public', public) ORDER BY id) j FROM storage.buckets
),
storage_policies AS (
  SELECT json_agg(json_build_object('name', policyname, 'cmd', cmd, 'roles', roles, 'using', qual, 'check', with_check) ORDER BY policyname) j
  FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects'
),
open_policies AS (
  SELECT json_agg(json_build_object('table', tablename, 'name', policyname, 'cmd', cmd, 'roles', roles, 'using', qual, 'check', with_check) ORDER BY tablename) j
  FROM pg_policies
  WHERE schemaname = 'public'
    AND ('public' = ANY (roles) OR 'anon' = ANY (roles) OR coalesce(qual, '') = 'true' OR coalesce(with_check, '') = 'true')
),
key_policies AS (
  SELECT json_agg(json_build_object('table', tablename, 'name', policyname, 'cmd', cmd, 'roles', roles, 'using', qual, 'check', with_check) ORDER BY tablename, policyname) j
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename IN ('couple_spaces', 'members', 'payments', 'admin_users', 'messages', 'profiles', 'feature_flags')
),
no_rls AS (
  SELECT json_agg(c.relname ORDER BY c.relname) j
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind = 'r' AND NOT c.relrowsecurity
),
definer_fns_open AS (
  SELECT json_agg(p.proname ORDER BY p.proname) j
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.prosecdef AND has_function_privilege('anon', p.oid, 'EXECUTE')
),
couple_space_grants AS (
  SELECT json_build_object(
    'update_columns', (SELECT json_agg(column_name ORDER BY column_name) FROM information_schema.column_privileges
                       WHERE table_schema = 'public' AND table_name = 'couple_spaces' AND grantee = 'authenticated' AND privilege_type = 'UPDATE'),
    'insert_columns', (SELECT json_agg(column_name ORDER BY column_name) FROM information_schema.column_privileges
                       WHERE table_schema = 'public' AND table_name = 'couple_spaces' AND grantee = 'authenticated' AND privilege_type = 'INSERT')
  ) j
),
migration_markers AS (
  SELECT json_object_agg(x, EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = x
  )) j
  FROM unnest(ARRAY['activate_trial', 'admin_approve_payment', 'upsert_feature_flag', 'activate_paid_subscription',
                    'expire_due_subscriptions', 'normalize_client_payment_insert', 'claim_push_token',
                    'create_couple_space', 'join_couple_space', 'grant_lovepoints_once']) x
),
is_admin_def AS (
  SELECT (SELECT pg_get_functiondef(p.oid) FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
          WHERE n.nspname = 'public' AND p.proname = 'is_admin' LIMIT 1) j
)
SELECT json_build_object(
  'buckets', (SELECT j FROM buckets),
  'storage_policies', (SELECT j FROM storage_policies),
  'open_policies', (SELECT j FROM open_policies),
  'key_policies', (SELECT j FROM key_policies),
  'tables_without_rls', (SELECT j FROM no_rls),
  'definer_functions_anon_can_run', (SELECT j FROM definer_fns_open),
  'couple_spaces_grants', (SELECT j FROM couple_space_grants),
  'migration_markers', (SELECT j FROM migration_markers),
  'is_admin', (SELECT j FROM is_admin_def)
) AS vistoria;
