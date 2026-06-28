-- Ciclo — registo de intimidade (atividade + metodo de prevenção),
-- base para o indicador de risco de gravidez. Segue o mesmo padrão de
-- RLS de daily_symptoms (owner sempre; parceiro só se
-- cycle_profiles.share_level = 'summary_signals').

CREATE TABLE IF NOT EXISTS public.intimacy_logs (
  id                uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  couple_space_id   uuid        NOT NULL REFERENCES public.couple_spaces(id) ON DELETE CASCADE,
  user_id           uuid        NOT NULL,
  day_key           date        NOT NULL DEFAULT CURRENT_DATE,
  protection_method text        NOT NULL DEFAULT 'nenhum'
                      CHECK (protection_method IN ('nenhum','preservativo','pilula','diu','outro')),
  notes             text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),

  UNIQUE (user_id, couple_space_id, day_key)
);

CREATE INDEX IF NOT EXISTS idx_intimacy_logs_user_day
  ON public.intimacy_logs (user_id, day_key);

ALTER TABLE public.intimacy_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owner can view own intimacy logs" ON public.intimacy_logs;
CREATE POLICY "Owner can view own intimacy logs"
  ON public.intimacy_logs FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Partner can view intimacy logs" ON public.intimacy_logs;
CREATE POLICY "Partner can view intimacy logs"
  ON public.intimacy_logs FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.members m1
    JOIN public.members m2 ON m1.couple_space_id = m2.couple_space_id
    JOIN public.cycle_profiles cp ON cp.user_id = m2.user_id
    WHERE m1.user_id = auth.uid() AND m2.user_id = intimacy_logs.user_id
      AND cp.share_level = 'summary_signals'
  ));

DROP POLICY IF EXISTS "Owner can insert own intimacy logs" ON public.intimacy_logs;
CREATE POLICY "Owner can insert own intimacy logs"
  ON public.intimacy_logs FOR INSERT
  WITH CHECK (user_id = auth.uid() AND public.is_member_of_couple_space(couple_space_id));

DROP POLICY IF EXISTS "Owner can update own intimacy logs" ON public.intimacy_logs;
CREATE POLICY "Owner can update own intimacy logs"
  ON public.intimacy_logs FOR UPDATE
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Owner can delete own intimacy logs" ON public.intimacy_logs;
CREATE POLICY "Owner can delete own intimacy logs"
  ON public.intimacy_logs FOR DELETE
  USING (user_id = auth.uid());

DROP TRIGGER IF EXISTS trg_intimacy_logs_updated_at ON public.intimacy_logs;
CREATE TRIGGER trg_intimacy_logs_updated_at
  BEFORE UPDATE ON public.intimacy_logs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

NOTIFY pgrst, 'reload schema';
