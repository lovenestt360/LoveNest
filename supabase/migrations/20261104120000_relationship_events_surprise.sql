-- Nossa História: capítulo surpresa.
-- Quem escreve pode "selar" o capítulo; o outro vê-o fechado até tocar para o abrir.
-- opened_at fica com o momento em que foi aberto (e o selo nunca volta).

ALTER TABLE public.relationship_events
  ADD COLUMN IF NOT EXISTS is_surprise boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS opened_at   timestamptz;

NOTIFY pgrst, 'reload schema';
