-- ══════════════════════════════════════════════════════════════════════
-- LoveNest — Smart Notifications Setup
-- ══════════════════════════════════════════════════════════════════════
--
-- 1. Ensure notification_history has the rule_key column
-- 2. Create index for efficient cooldown queries
-- 3. Schedule smart-notifications Edge Function via pg_cron + pg_net
--    (runs 3× per day at healthy hours)
--
-- ⚠️  IMPORTANTE: Este SQL requer as extensões pg_cron e pg_net.
--     Ambas já vêm ativadas por padrão nos projetos Supabase.
--     Se o pg_cron não estiver ativo, vai ao painel Supabase →
--     Database → Extensions → ativar pg_cron.
-- ══════════════════════════════════════════════════════════════════════


-- ── 1. notification_history — ensure schema ───────────────────────────

CREATE TABLE IF NOT EXISTS public.notification_history (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL,
  couple_space_id UUID,
  rule_key        TEXT NOT NULL,
  sent_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add rule_key if upgrading from old schema (no-op if already exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'notification_history'
      AND column_name  = 'rule_key'
  ) THEN
    ALTER TABLE public.notification_history ADD COLUMN rule_key TEXT NOT NULL DEFAULT 'unknown';
  END IF;
END $$;

-- Efficient lookups by user + rule + time
CREATE INDEX IF NOT EXISTS idx_notif_history_user_rule_time
  ON public.notification_history (user_id, rule_key, sent_at DESC);

-- Daily cap index
CREATE INDEX IF NOT EXISTS idx_notif_history_user_time
  ON public.notification_history (user_id, sent_at DESC);

-- RLS
ALTER TABLE public.notification_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role manages notification_history" ON public.notification_history;
CREATE POLICY "Service role manages notification_history"
  ON public.notification_history
  USING (auth.role() = 'service_role');

-- ── 2. Auto-cleanup old history (keep only 30 days) ──────────────────

CREATE OR REPLACE FUNCTION public.cleanup_notification_history()
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  DELETE FROM public.notification_history
  WHERE sent_at < now() - INTERVAL '30 days';
END;
$$;


-- ── 3. pg_cron schedules ──────────────────────────────────────────────
--
-- Triggers the smart-notifications Edge Function 3× per day UTC:
--   08:00 UTC → 10:00 CAT (Mozambique)  — morning
--   17:00 UTC → 19:00 CAT               — evening (main window)
--   20:00 UTC → 22:00 CAT               — last chance (streak risk)
--
-- Substitua <SUPABASE_URL> e <SERVICE_ROLE_KEY> pelos valores reais
-- do vosso projeto antes de correr este script.
-- Podem encontrá-los em: Supabase Dashboard → Settings → API
--
-- IMPORTANTE: pg_net.http_post é assíncrono — os jobs são fire-and-forget.

DO $$
DECLARE
  v_url TEXT := current_setting('app.supabase_url', true);
BEGIN
  -- Se pg_cron não estiver disponível, salta silenciosamente
  IF NOT EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'
  ) THEN
    RAISE NOTICE 'pg_cron not installed — skipping cron job creation. Enable it in Supabase Dashboard → Extensions.';
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pg_net'
  ) THEN
    RAISE NOTICE 'pg_net not installed — skipping cron job creation. Enable it in Supabase Dashboard → Extensions.';
    RETURN;
  END IF;

  RAISE NOTICE 'pg_cron and pg_net found. Cron jobs must be created manually in the Supabase Dashboard SQL editor using the commands in the comment below.';
END $$;


-- ══════════════════════════════════════════════════════════════════════
-- MANUAL STEP (copy-paste no Supabase SQL Editor após ativar pg_cron):
--
-- Substitua os valores entre < > pelos reais do vosso projeto.
--
-- SELECT cron.schedule(
--   'lovenest-smart-notif-morning',
--   '0 8 * * *',
--   $$
--   SELECT net.http_post(
--     url     := '<SUPABASE_URL>/functions/v1/smart-notifications',
--     headers := jsonb_build_object(
--       'Content-Type',  'application/json',
--       'Authorization', 'Bearer <SERVICE_ROLE_KEY>'
--     ),
--     body    := '{}'::jsonb
--   );
--   $$
-- );
--
-- SELECT cron.schedule(
--   'lovenest-smart-notif-evening',
--   '0 17 * * *',
--   $$
--   SELECT net.http_post(
--     url     := '<SUPABASE_URL>/functions/v1/smart-notifications',
--     headers := jsonb_build_object(
--       'Content-Type',  'application/json',
--       'Authorization', 'Bearer <SERVICE_ROLE_KEY>'
--     ),
--     body    := '{}'::jsonb
--   );
--   $$
-- );
--
-- SELECT cron.schedule(
--   'lovenest-smart-notif-night',
--   '0 20 * * *',
--   $$
--   SELECT net.http_post(
--     url     := '<SUPABASE_URL>/functions/v1/smart-notifications',
--     headers := jsonb_build_object(
--       'Content-Type',  'application/json',
--       'Authorization', 'Bearer <SERVICE_ROLE_KEY>'
--     ),
--     body    := '{}'::jsonb
--   );
--   $$
-- );
--
-- SELECT cron.schedule(
--   'lovenest-cleanup-notif-history',
--   '0 3 * * 0',  -- Sundays at 3am UTC
--   $$ SELECT public.cleanup_notification_history(); $$
-- );
-- ══════════════════════════════════════════════════════════════════════


NOTIFY pgrst, 'reload schema';
SELECT 'smart notifications setup ✓' AS resultado;
