-- Duas regras de acesso mais apertadas:
--  * Registos de intimidade: só a própria pessoa os vê, seja qual for a partilha do ciclo.
--  * Presença do dia: cada pessoa só regista a sua. A app grava pela função log_daily_activity.
-- Idempotente. Aplicar à mão no SQL Editor do Supabase.

BEGIN;

DROP POLICY IF EXISTS "Partner can view intimacy logs" ON public.intimacy_logs;

DROP POLICY IF EXISTS da_insert_own ON public.daily_activity;
CREATE POLICY da_insert_own ON public.daily_activity
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.members m
      WHERE m.couple_space_id = daily_activity.couple_space_id
        AND m.user_id = auth.uid()
    )
  );

COMMIT;
