-- ══════════════════════════════════════════════════════════════════
-- BIBLIOTECA 2.0 — Fase A: fundação (status/tags/flags, avaliações,
-- favoritos, reflexões do casal, vistas, minutos lidos)
-- ══════════════════════════════════════════════════════════════════

-- ── 1. books — novas colunas ──────────────────────────────────────
ALTER TABLE public.books
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'published'
    CHECK (status IN ('published','draft','archived')),
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS is_recommended boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS estimated_minutes integer,
  ADD COLUMN IF NOT EXISTS page_count integer,
  ADD COLUMN IF NOT EXISTS chapter_count integer,
  ADD COLUMN IF NOT EXISTS views_count integer NOT NULL DEFAULT 0;

UPDATE public.books SET status = CASE WHEN is_published THEN 'published' ELSE 'draft' END;

DROP POLICY IF EXISTS "Anyone authenticated can read published books" ON public.books;

ALTER TABLE public.books DROP COLUMN IF EXISTS is_published;

CREATE INDEX IF NOT EXISTS idx_books_tags ON public.books USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_books_status ON public.books(status);

CREATE POLICY "Anyone authenticated can read published books"
    ON public.books FOR SELECT TO authenticated
    USING (status = 'published' OR public.is_admin());

-- ── 2. book_ratings (agregado entre todos os casais) ──────────────
CREATE TABLE IF NOT EXISTS public.book_ratings (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    book_id     uuid NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
    user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    rating      smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now(),
    UNIQUE (book_id, user_id)
);

ALTER TABLE public.book_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own rating"
    ON public.book_ratings FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins manage ratings"
    ON public.book_ratings FOR ALL
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

DROP TRIGGER IF EXISTS update_book_ratings_updated_at ON public.book_ratings;
CREATE TRIGGER update_book_ratings_updated_at
    BEFORE UPDATE ON public.book_ratings
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- ── 3. book_favorites (agregado entre todos os casais) ────────────
CREATE TABLE IF NOT EXISTS public.book_favorites (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    book_id     uuid NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
    user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at  timestamptz NOT NULL DEFAULT now(),
    UNIQUE (book_id, user_id)
);

ALTER TABLE public.book_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own favorite"
    ON public.book_favorites FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins manage favorites"
    ON public.book_favorites FOR ALL
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- ── 4. book_reflections (reflexao/comentario privado ao casal, por capitulo) ─
CREATE TABLE IF NOT EXISTS public.book_reflections (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    couple_space_id  uuid NOT NULL REFERENCES public.couple_spaces(id) ON DELETE CASCADE,
    book_id          uuid NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
    chapter_id       text NOT NULL,
    user_id          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content          text NOT NULL,
    created_at       timestamptz NOT NULL DEFAULT now(),
    updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_book_reflections_book ON public.book_reflections(couple_space_id, book_id, chapter_id);

ALTER TABLE public.book_reflections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Couple members view reflections"
    ON public.book_reflections FOR SELECT
    USING (public.is_member_of_couple_space(couple_space_id) OR public.is_admin());

CREATE POLICY "Members write own reflections"
    ON public.book_reflections FOR INSERT
    WITH CHECK (auth.uid() = user_id AND public.is_member_of_couple_space(couple_space_id));

CREATE POLICY "Members update own reflections"
    ON public.book_reflections FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins manage reflections"
    ON public.book_reflections FOR ALL
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

DROP TRIGGER IF EXISTS update_book_reflections_updated_at ON public.book_reflections;
CREATE TRIGGER update_book_reflections_updated_at
    BEFORE UPDATE ON public.book_reflections
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- ── 5. book_reading_progress — minutos lidos (dashboard Fase F) ───
ALTER TABLE public.book_reading_progress
  ADD COLUMN IF NOT EXISTS total_minutes_read integer NOT NULL DEFAULT 0;

-- ── 6. RPCs SECURITY DEFINER — agregados sem expor linhas de outros utilizadores ─
CREATE OR REPLACE FUNCTION public.get_book_stats(p_book_id uuid)
RETURNS TABLE(avg_rating numeric, ratings_count int, favorites_count int)
SECURITY DEFINER SET search_path = public
LANGUAGE sql STABLE AS $$
  SELECT
    COALESCE((SELECT AVG(rating) FROM book_ratings WHERE book_id = p_book_id), 0)::numeric,
    (SELECT COUNT(*) FROM book_ratings WHERE book_id = p_book_id)::int,
    (SELECT COUNT(*) FROM book_favorites WHERE book_id = p_book_id)::int;
$$;

CREATE OR REPLACE FUNCTION public.fn_increment_book_views(p_book_id uuid)
RETURNS void
SECURITY DEFINER SET search_path = public
LANGUAGE sql AS $$
  UPDATE books SET views_count = views_count + 1 WHERE id = p_book_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_book_stats(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_increment_book_views(uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';
