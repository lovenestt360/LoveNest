-- ══════════════════════════════════════════════════════════════════════════
-- 2026-10-07 — reagenda o cron mensal do LoveWrapped com o novo segredo
--
-- A migration de segurança de 2026-09-11 passou a exigir, em
-- generate-love-wrapped, ou uma sessão de admin ou o header x-cron-secret
-- (contra o segredo LOVE_WRAPPED_CRON_SECRET). O cron original
-- (20260710000002_love_wrapped_cron.sql) só enviava o anon key no
-- Authorization — isso nunca passa em auth.getUser(), por isso a próxima
-- execução (dia 1, 08:00 UTC) devolvia 401 e o LoveWrapped mensal nunca
-- era gerado.
--
-- LOVE_WRAPPED_CRON_SECRET já está definido como secret da Edge Function
-- (supabase secrets set). Aqui só reagendamos o job para enviar esse
-- valor no header x-cron-secret, em vez do anon key antigo.
-- ══════════════════════════════════════════════════════════════════════════

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'love-wrapped-monthly') THEN
    PERFORM cron.unschedule('love-wrapped-monthly');
  END IF;
END $$;

-- Substitui '<COLA_AQUI_O_SEGREDO>' pelo mesmo valor que definiste com
-- `supabase secrets set LOVE_WRAPPED_CRON_SECRET=...` antes de correr isto.
select cron.schedule(
  'love-wrapped-monthly',
  '0 8 1 * *',
  $$
  select net.http_post(
    url     := 'https://zyzeiwyfsnbnpzdqtxik.supabase.co/functions/v1/generate-love-wrapped',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', '<COLA_AQUI_O_SEGREDO>'
    ),
    body    := '{}'::jsonb
  ) as request_id;
  $$
);

SELECT 'cron do LoveWrapped reagendado com x-cron-secret ✓' AS resultado;
