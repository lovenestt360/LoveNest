-- Cerimónias — Fase 5 do LoveNest Progress System
-- Tabela de dedupe: garante que cada marco (subida de nível, livro
-- terminado, aniversário, cápsula aberta) só dispara a Cerimónia
-- full-screen uma única vez por casal. Mesmo padrão de
-- relationship_milestones (UNIQUE constraint como garantia ao nível
-- da BD, não só no cliente).

CREATE TABLE IF NOT EXISTS public.ceremonies_log (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_space_id uuid        NOT NULL REFERENCES couple_spaces(id) ON DELETE CASCADE,
  ceremony_type   text        NOT NULL,   -- 'level_up' | 'livro_concluido' | 'aniversario' | 'capsula'
  ceremony_key    text        NOT NULL,   -- ex: nível "4", id do livro, "{event_id}_{ano}", id da cápsula
  shown_at        timestamptz NOT NULL DEFAULT now(),

  UNIQUE (couple_space_id, ceremony_type, ceremony_key)
);

ALTER TABLE public.ceremonies_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "couple members select ceremonies_log"
  ON public.ceremonies_log FOR SELECT
  USING (is_member_of_couple_space(couple_space_id));

CREATE POLICY "couple members insert ceremonies_log"
  ON public.ceremonies_log FOR INSERT
  WITH CHECK (is_member_of_couple_space(couple_space_id));

-- Backfill: marca como "já mostrados" todos os níveis que cada casa já
-- atingiu antes desta migration, para que o lançamento da Cerimónia não
-- dispare uma fila de celebrações retroativas para quem já tem
-- LovePoints acumulados. Só a PRÓXIMA subida de nível, a partir de
-- agora, dispara a Cerimónia.
WITH levels(lvl, min_pts) AS (
  VALUES (2, 50), (3, 150), (4, 400), (5, 900), (6, 1800), (7, 3200)
),
current_state AS (
  SELECT cs.id AS couple_space_id, COALESCE(get_total_points(cs.id), 0) AS pts
  FROM public.couple_spaces cs
)
INSERT INTO public.ceremonies_log (couple_space_id, ceremony_type, ceremony_key)
SELECT cs.couple_space_id, 'level_up', l.lvl::text
FROM current_state cs
JOIN levels l ON l.min_pts <= cs.pts
ON CONFLICT DO NOTHING;
