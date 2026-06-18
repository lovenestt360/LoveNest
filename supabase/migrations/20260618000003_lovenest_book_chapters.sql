-- ══════════════════════════════════════════════════════════════════
-- BIBLIOTECA — Fase G: Livros Nativos "LoveNest Book" (capítulos na BD)
-- ══════════════════════════════════════════════════════════════════

-- ── 1. books.file_type passa a aceitar 'lovenest' ───────────────────
ALTER TABLE public.books DROP CONSTRAINT IF EXISTS books_file_type_check;
ALTER TABLE public.books ADD CONSTRAINT books_file_type_check
    CHECK (file_type IN ('pdf','epub','lovenest'));

-- ── 2. book_chapters ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.book_chapters (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    book_id     uuid NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
    title       text NOT NULL,
    content     text NOT NULL DEFAULT '',
    order_index integer NOT NULL DEFAULT 0,
    status      text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published')),
    word_count  integer NOT NULL DEFAULT 0,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_book_chapters_book ON public.book_chapters(book_id, order_index);

ALTER TABLE public.book_chapters ENABLE ROW LEVEL SECURITY;

-- Leitura: admins veem tudo; utilizadores só capitulos publicados de
-- livros a que tenham acesso (gratuito ou compra aprovada do seu casal).
CREATE POLICY "Read chapters of accessible books"
    ON public.book_chapters FOR SELECT
    TO authenticated
    USING (
        public.is_admin()
        OR (
            status = 'published'
            AND EXISTS (
                SELECT 1 FROM public.books b
                WHERE b.id = book_chapters.book_id
                  AND b.status = 'published'
                  AND (
                      b.is_free
                      OR EXISTS (
                          SELECT 1 FROM public.book_purchases bp
                          WHERE bp.book_id = b.id
                            AND bp.status = 'approved'
                            AND public.is_member_of_couple_space(bp.couple_space_id)
                      )
                  )
            )
        )
    );

CREATE POLICY "Admins manage chapters"
    ON public.book_chapters FOR ALL
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

DROP TRIGGER IF EXISTS update_book_chapters_updated_at ON public.book_chapters;
CREATE TRIGGER update_book_chapters_updated_at
    BEFORE UPDATE ON public.book_chapters
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- ── 3. trigger: books.chapter_count segue book_chapters publicados ──
CREATE OR REPLACE FUNCTION public.fn_sync_book_chapter_count()
RETURNS trigger
SECURITY DEFINER SET search_path = public AS $$
DECLARE
    affected_book_id uuid;
BEGIN
    affected_book_id := COALESCE(NEW.book_id, OLD.book_id);
    UPDATE public.books
    SET chapter_count = (
        SELECT COUNT(*) FROM public.book_chapters
        WHERE book_id = affected_book_id AND status = 'published'
    )
    WHERE id = affected_book_id;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sync_book_chapter_count ON public.book_chapters;
CREATE TRIGGER sync_book_chapter_count
    AFTER INSERT OR UPDATE OR DELETE ON public.book_chapters
    FOR EACH ROW EXECUTE PROCEDURE fn_sync_book_chapter_count();

NOTIFY pgrst, 'reload schema';

SELECT 'Biblioteca: LoveNest Book (book_chapters) criado ✓' AS resultado;
