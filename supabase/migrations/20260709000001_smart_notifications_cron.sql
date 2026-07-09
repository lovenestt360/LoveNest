-- ─────────────────────────────────────────────────────────────────────────────
-- Smart Notifications — Cron Job (pg_cron + pg_net)
--
-- Chama a Edge Function smart-notifications a cada hora.
-- A função verifica internamente se é hora adequada (8h–22h hora local do
-- utilizador) e respeita cooldowns e máximo de 2 notificações/dia.
--
-- Pré-requisito: activar as extensões no Dashboard do Supabase:
--   Database → Extensions → pg_cron  (enable)
--   Database → Extensions → pg_net   (enable)
-- ─────────────────────────────────────────────────────────────────────────────

-- Garante que as extensões existem (no-op se já activas)
create extension if not exists pg_cron  with schema extensions;
create extension if not exists pg_net   with schema extensions;

-- Remove job anterior se existir (idempotente)
do $$
begin
  if exists (select 1 from cron.job where jobname = 'smart-notifs-hourly') then
    perform cron.unschedule('smart-notifs-hourly');
  end if;
end;
$$;

-- Cron: cada hora no minuto 0
select cron.schedule(
  'smart-notifs-hourly',
  '0 * * * *',
  $$
  select net.http_post(
    url     := 'https://zyzeiwyfsnbnpzdqtxik.supabase.co/functions/v1/smart-notifications',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5emVpd3lmc25ibnB6ZHF0eGlrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3MDQ3MjAsImV4cCI6MjA4OTI4MDcyMH0.h_-zFXHJU2PQhVP9aWRoYaQx6DlJzB5LihYzgRvPqvA'
    ),
    body    := '{}'::jsonb
  ) as request_id;
  $$
);
