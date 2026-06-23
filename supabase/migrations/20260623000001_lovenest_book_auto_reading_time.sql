-- ══════════════════════════════════════════════════════════════════
-- BIBLIOTECA — LoveNest Book: tempo de leitura estimado automático
-- ══════════════════════════════════════════════════════════════════
-- Para livros 'lovenest', estimated_minutes passa a ser calculado a partir
-- da soma de word_count dos capítulos publicados (~200 palavras/minuto,
-- velocidade média de leitura silenciosa), sempre que um capítulo é
-- criado, editado, publicado/despublicado ou eliminado. PDF/EPUB
-- continuam com o valor definido manualmente pelo admin.

CREATE OR REPLACE FUNCTION public.fn_sync_book_chapter_stats()
RETURNS trigger
SECURITY DEFINER SET search_path = public AS $$
DECLARE
    affected_book_id uuid;
    published_count integer;
    total_words integer;
BEGIN
    affected_book_id := COALESCE(NEW.book_id, OLD.book_id);

    SELECT COUNT(*), COALESCE(SUM(word_count), 0)
    INTO published_count, total_words
    FROM public.book_chapters
    WHERE book_id = affected_book_id AND status = 'published';

    UPDATE public.books
    SET chapter_count = published_count,
        estimated_minutes = CASE
            WHEN file_type = 'lovenest' AND total_words > 0 THEN CEIL(total_words::numeric / 200)::integer
            WHEN file_type = 'lovenest' THEN NULL
            ELSE estimated_minutes
        END
    WHERE id = affected_book_id;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sync_book_chapter_count ON public.book_chapters;
DROP TRIGGER IF EXISTS sync_book_chapter_stats ON public.book_chapters;
CREATE TRIGGER sync_book_chapter_stats
    AFTER INSERT OR UPDATE OR DELETE ON public.book_chapters
    FOR EACH ROW EXECUTE PROCEDURE fn_sync_book_chapter_stats();

-- Recalcula imediatamente para os livros LoveNest Book já existentes.
UPDATE public.books b
SET estimated_minutes = CEIL(sub.total_words::numeric / 200)::integer
FROM (
    SELECT book_id, SUM(word_count) AS total_words
    FROM public.book_chapters
    WHERE status = 'published'
    GROUP BY book_id
) sub
WHERE b.id = sub.book_id AND b.file_type = 'lovenest' AND sub.total_words > 0;

UPDATE public.books
SET estimated_minutes = NULL
WHERE file_type = 'lovenest'
  AND id NOT IN (
      SELECT book_id FROM public.book_chapters WHERE status = 'published'
  );

NOTIFY pgrst, 'reload schema';

SELECT 'Biblioteca: tempo de leitura automático para LoveNest Book ✓' AS resultado;
