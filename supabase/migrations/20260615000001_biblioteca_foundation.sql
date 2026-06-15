-- ══════════════════════════════════════════════════════════════════
-- BIBLIOTECA — Fase 1: Fundação (schema + storage + RLS + admin CMS)
-- ══════════════════════════════════════════════════════════════════

-- ── 1. book_categories ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.book_categories (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name        text NOT NULL,
    slug        text NOT NULL UNIQUE,
    sort_order  integer NOT NULL DEFAULT 0,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.book_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read categories"
    ON public.book_categories FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Admins manage categories"
    ON public.book_categories FOR ALL
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- ── 2. books ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.books (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title           text NOT NULL,
    author          text,
    description     text,
    cover_url       text,                 -- public URL (bucket book-covers)
    file_path       text,                 -- path dentro do bucket privado book-files
    file_type       text CHECK (file_type IN ('pdf','epub')),
    is_free         boolean NOT NULL DEFAULT false,
    price           numeric(10,2) DEFAULT 0,
    currency        text NOT NULL DEFAULT 'MZN',
    category_id     uuid REFERENCES public.book_categories(id) ON DELETE SET NULL,
    is_published    boolean NOT NULL DEFAULT true,
    sort_order      integer NOT NULL DEFAULT 0,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_books_category   ON public.books(category_id);
CREATE INDEX IF NOT EXISTS idx_books_published  ON public.books(is_published);

ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read published books"
    ON public.books FOR SELECT
    TO authenticated
    USING (is_published = true OR public.is_admin());

CREATE POLICY "Admins manage books"
    ON public.books FOR ALL
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- ── 3. library_settings (singleton — 1 linha) ────────────────────
CREATE TABLE IF NOT EXISTS public.library_settings (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    grid_columns        integer NOT NULL DEFAULT 2 CHECK (grid_columns BETWEEN 1 AND 4),
    banner_enabled      boolean NOT NULL DEFAULT false,
    banner_image_url    text,
    banner_title        text,
    banner_subtitle     text,
    banner_link_book_id uuid REFERENCES public.books(id) ON DELETE SET NULL,
    updated_at          timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.library_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read library settings"
    ON public.library_settings FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Admins manage library settings"
    ON public.library_settings FOR ALL
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

INSERT INTO public.library_settings (grid_columns, banner_enabled)
SELECT 2, false
WHERE NOT EXISTS (SELECT 1 FROM public.library_settings);

-- ── 4. book_purchases (ownership por couple_space, pagamento manual) ─
CREATE TABLE IF NOT EXISTS public.book_purchases (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    couple_space_id uuid NOT NULL REFERENCES public.couple_spaces(id) ON DELETE CASCADE,
    book_id         uuid NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
    status          text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
    amount          text,
    method          text,
    proof_url       text,
    requested_by    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    admin_notes     text,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now(),
    UNIQUE (couple_space_id, book_id)
);

CREATE INDEX IF NOT EXISTS idx_book_purchases_status ON public.book_purchases(status);
CREATE INDEX IF NOT EXISTS idx_book_purchases_couple  ON public.book_purchases(couple_space_id);

ALTER TABLE public.book_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Couple members view own purchases"
    ON public.book_purchases FOR SELECT
    USING (public.is_member_of_couple_space(couple_space_id) OR public.is_admin());

CREATE POLICY "Couple members insert purchase requests"
    ON public.book_purchases FOR INSERT
    WITH CHECK (
        public.is_member_of_couple_space(couple_space_id)
        AND status = 'pending'
    );

-- Permite re-submissão (pending -> pending, ou rejected -> pending) mas
-- NUNCA permite ao casal definir status='approved' diretamente.
CREATE POLICY "Couple members update own pending or rejected purchase"
    ON public.book_purchases FOR UPDATE
    USING (public.is_member_of_couple_space(couple_space_id) AND status IN ('pending','rejected'))
    WITH CHECK (public.is_member_of_couple_space(couple_space_id) AND status = 'pending');

CREATE POLICY "Admins manage purchases"
    ON public.book_purchases FOR ALL
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- ── updated_at triggers (reaproveita update_updated_at_column existente) ─
DROP TRIGGER IF EXISTS update_books_updated_at ON public.books;
CREATE TRIGGER update_books_updated_at
    BEFORE UPDATE ON public.books
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_book_categories_updated_at ON public.book_categories;
CREATE TRIGGER update_book_categories_updated_at
    BEFORE UPDATE ON public.book_categories
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_book_purchases_updated_at ON public.book_purchases;
CREATE TRIGGER update_book_purchases_updated_at
    BEFORE UPDATE ON public.book_purchases
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_library_settings_updated_at ON public.library_settings;
CREATE TRIGGER update_library_settings_updated_at
    BEFORE UPDATE ON public.library_settings
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- ══════════════════════════════════════════════════════════════════
-- STORAGE BUCKETS
-- ══════════════════════════════════════════════════════════════════

-- book-covers — PÚBLICO
INSERT INTO storage.buckets (id, name, public)
VALUES ('book-covers', 'book-covers', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public can view book covers"
ON storage.objects FOR SELECT
USING (bucket_id = 'book-covers');

CREATE POLICY "Admins manage book covers"
ON storage.objects FOR ALL
USING (bucket_id = 'book-covers' AND public.is_admin())
WITH CHECK (bucket_id = 'book-covers' AND public.is_admin());

-- library-banners — PÚBLICO
INSERT INTO storage.buckets (id, name, public)
VALUES ('library-banners', 'library-banners', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public can view library banners"
ON storage.objects FOR SELECT
USING (bucket_id = 'library-banners');

CREATE POLICY "Admins manage library banners"
ON storage.objects FOR ALL
USING (bucket_id = 'library-banners' AND public.is_admin())
WITH CHECK (bucket_id = 'library-banners' AND public.is_admin());

-- book-files — PRIVADO (PDF/EPUB; acesso via signed URL)
INSERT INTO storage.buckets (id, name, public)
VALUES ('book-files', 'book-files', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Admins manage book files"
ON storage.objects FOR ALL
USING (bucket_id = 'book-files' AND public.is_admin())
WITH CHECK (bucket_id = 'book-files' AND public.is_admin());

-- Qualquer autenticado pode gerar signed URL; o gate real (livro grátis OU
-- couple_space com book_purchases.status='approved') é feito na app antes
-- de chamar createSignedUrl — reforçado na Fase 3 (BookReader).
CREATE POLICY "Authenticated can read book files via signed url"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'book-files');

NOTIFY pgrst, 'reload schema';

SELECT 'Biblioteca: fundação criada (tabelas + storage + RLS) ✓' AS resultado;
