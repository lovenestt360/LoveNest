-- smart-notifications passa a exigir o header x-cron-secret (antes aceitava o
-- anon key, que é público — qualquer pessoa podia disparar notificações).
-- O job horário envia agora o mesmo segredo do love-wrapped, lido do Vault.
--
-- APLICAR ANTES de publicar a nova versão da Edge Function smart-notifications
-- (a versão antiga ignora o header, por isso esta ordem não quebra nada).
-- Idempotente. Aplicar à mão no SQL Editor do Supabase.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'love_wrapped_cron_secret') THEN
    RAISE EXCEPTION 'Falta o segredo love_wrapped_cron_secret no Vault — ver 20261007000000_reschedule_love_wrapped_cron.sql';
  END IF;
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'smart-notifs-hourly') THEN
    PERFORM cron.unschedule('smart-notifs-hourly');
  END IF;
END $$;

SELECT cron.schedule(
  'smart-notifs-hourly',
  '0 * * * *',
  $cmd$
  select net.http_post(
    url     := 'https://zyzeiwyfsnbnpzdqtxik.supabase.co/functions/v1/smart-notifications',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      -- anon key (público): só para passar o verify_jwt da função.
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5emVpd3lmc25ibnB6ZHF0eGlrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3MDQ3MjAsImV4cCI6MjA4OTI4MDcyMH0.h_-zFXHJU2PQhVP9aWRoYaQx6DlJzB5LihYzgRvPqvA',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets
                        where name = 'love_wrapped_cron_secret')
    ),
    body    := '{}'::jsonb
  ) as request_id;
  $cmd$
);
