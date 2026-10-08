-- ══════════════════════════════════════════════════════════════════════════
-- 2026-10-07 — estado dos jobs pg_cron, reproduzível e sem segredos no repo
--
-- 1. love-wrapped-monthly: desde 2026-09-11, generate-love-wrapped exige uma
--    sessão de admin ou o header x-cron-secret (= secret LOVE_WRAPPED_CRON_SECRET
--    da Edge Function). O job original (20260710000002) enviava o anon key, que
--    nunca passa — a execução de dia 1 devolvia 401.
--    O valor do segredo NÃO está aqui: o job lê-o do Supabase Vault no momento
--    em que corre (vault.decrypted_secrets, nome 'love_wrapped_cron_secret').
--
-- 2. lovenest-smart-notif-morning/evening/night: apontavam para um projeto
--    Supabase antigo (jxwvvbqitdcczlwnptxj) e falhavam todos os dias. O job
--    smart-notifs-hourly (20260709000001) já cobre essas notificações.
--
-- PRÉ-REQUISITO (uma vez por ambiente, fora do repo — o valor tem de ser o
-- mesmo que `supabase secrets set LOVE_WRAPPED_CRON_SECRET=...`):
--   select vault.create_secret('<valor>', 'love_wrapped_cron_secret',
--     'Header x-cron-secret do job love-wrapped-monthly');
-- Para rodar o segredo: vault.update_secret(<id>, '<novo valor>') + supabase
-- secrets set com o mesmo valor. O job não precisa de ser reagendado.
--
-- Idempotente: pode ser corrido várias vezes.
-- ══════════════════════════════════════════════════════════════════════════

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'love_wrapped_cron_secret') THEN
    RAISE EXCEPTION 'Falta o segredo love_wrapped_cron_secret no Vault — ver PRÉ-REQUISITO no topo deste ficheiro';
  END IF;
END $$;

DO $$
DECLARE
  j text;
BEGIN
  FOREACH j IN ARRAY ARRAY[
    'lovenest-smart-notif-morning',
    'lovenest-smart-notif-evening',
    'lovenest-smart-notif-night',
    'love-wrapped-monthly'
  ] LOOP
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = j) THEN
      PERFORM cron.unschedule(j);
    END IF;
  END LOOP;
END $$;

SELECT cron.schedule(
  'love-wrapped-monthly',
  '0 8 1 * *',
  $cmd$
  select net.http_post(
    url     := 'https://zyzeiwyfsnbnpzdqtxik.supabase.co/functions/v1/generate-love-wrapped',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets
                        where name = 'love_wrapped_cron_secret')
    ),
    body    := '{}'::jsonb
  ) as request_id;
  $cmd$
);
