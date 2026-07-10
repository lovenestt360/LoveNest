-- daily_activity não estava na publicação supabase_realtime.
-- Sem isto, postgres_changes nunca dispara para esta tabela,
-- por isso o LoveStreakCard não actualizava em tempo real.
ALTER PUBLICATION supabase_realtime ADD TABLE public.daily_activity;
