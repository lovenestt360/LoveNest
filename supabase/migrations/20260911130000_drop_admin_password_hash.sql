-- ══════════════════════════════════════════════════════════════════════════
-- 2026-09-11 (parte 2) — admin_users.password_hash ficou órfã depois da
-- migration de segurança anterior: o novo login de admin usa o Supabase
-- Auth (sessão real), não esta coluna. Mas ela continuava NOT NULL, e
-- admin-claim nunca a preenche, por isso o INSERT falhava:
--   null value in column "password_hash" of relation "admin_users"
--   violates not-null constraint
--
-- Remove a coluna por completo — para além de estar morta, guardava um
-- hash SHA-256 sem salt, que não era um segredo forte para começar.
-- ══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.admin_users DROP COLUMN IF EXISTS password_hash;

NOTIFY pgrst, 'reload schema';

SELECT 'password_hash removida de admin_users ✓' AS resultado;
