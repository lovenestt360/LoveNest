-- ─────────────────────────────────────────────────────────────────────────────
-- Love Wrapped — Cron mensal (pg_cron + pg_net)
--
-- Dia 1 de cada mês às 08:00 UTC, invoca generate-love-wrapped que:
--   1. Agrega os dados do mês anterior para todos os couple_spaces
--   2. Insere/actualiza a tabela love_wrapped
--   3. Envia push notification a cada espaço
--
-- Pré-requisito: extensões pg_cron e pg_net activas (já aplicadas em
-- 20260709000001_smart_notifications_cron.sql).
-- ─────────────────────────────────────────────────────────────────────────────

do $$
begin
  if exists (select 1 from cron.job where jobname = 'love-wrapped-monthly') then
    perform cron.unschedule('love-wrapped-monthly');
  end if;
end;
$$;

select cron.schedule(
  'love-wrapped-monthly',
  '0 8 1 * *',
  $$
  select net.http_post(
    url     := 'https://zyzeiwyfsnbnpzdqtxik.supabase.co/functions/v1/generate-love-wrapped',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5emVpd3lmc25ibnB6ZHF0eGlrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3MDQ3MjAsImV4cCI6MjA4OTI4MDcyMH0.h_-zFXHJU2PQhVP9aWRoYaQx6DlJzB5LihYzgRvPqvA'
    ),
    body    := '{}'::jsonb
  ) as request_id;
  $$
);
