-- ══════════════════════════════════════════════════════════════════
-- BIBLIOTECA 2.0 — Fase F: dashboard de estatisticas de leitura
-- ══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.get_reading_stats(p_couple_space_id uuid, p_user_id uuid)
RETURNS TABLE(
    total_minutes int,
    books_completed int,
    books_started int,
    chapters_completed int,
    reading_days int,
    avg_completion numeric
)
SECURITY DEFINER SET search_path = public
LANGUAGE sql STABLE AS $$
    SELECT
        COALESCE(SUM(brp.total_minutes_read), 0)::int,
        COUNT(*) FILTER (WHERE brp.progress_percent >= 100)::int,
        COUNT(*)::int,
        COALESCE(SUM(FLOOR(brp.progress_percent / 100.0 * COALESCE(b.chapter_count, 0))), 0)::int,
        COUNT(DISTINCT date_trunc('day', brp.updated_at))::int,
        COALESCE(AVG(brp.progress_percent), 0)::numeric
    FROM book_reading_progress brp
    JOIN books b ON b.id = brp.book_id
    WHERE brp.couple_space_id = p_couple_space_id
      AND brp.user_id = p_user_id
      AND public.is_member_of_couple_space(p_couple_space_id);
$$;

GRANT EXECUTE ON FUNCTION public.get_reading_stats(uuid, uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';
