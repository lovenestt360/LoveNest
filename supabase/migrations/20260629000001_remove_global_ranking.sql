-- Fase 0 do LoveNest Progress System (docs/LOVENEST_PROGRESS_SYSTEM.md):
-- remove o Ranking Global por completo. A filosofia passa de
-- "competir com outros casais" para "evoluir na própria jornada".

DROP FUNCTION IF EXISTS public.fn_get_global_ranking(TEXT);

-- Órfã desde o refactor de streak v4 — log_daily_activity já não a chama.
DROP FUNCTION IF EXISTS public.get_ranking_snapshot(UUID);

NOTIFY pgrst, 'reload schema';
