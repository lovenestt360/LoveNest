-- Jornada: "A vossa chama evoluiu!" para os dois parceiros.
-- Cada pessoa guarda a fase mais alta do Guardião que já celebrou, para ver a
-- animação uma vez, em qualquer telemóvel (antes ficava só no aparelho).

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS guardian_stage_seen smallint;

NOTIFY pgrst, 'reload schema';
