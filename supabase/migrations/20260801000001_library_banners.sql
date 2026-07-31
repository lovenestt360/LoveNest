-- Tabela de banners múltiplos para a Biblioteca
CREATE TABLE IF NOT EXISTS public.library_banners (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    sort_order   int NOT NULL DEFAULT 0,
    enabled      boolean NOT NULL DEFAULT true,
    image_url    text,
    title        text,
    subtitle     text,
    link_book_id uuid REFERENCES public.books(id) ON DELETE SET NULL,
    created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.library_banners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read banners"
    ON public.library_banners FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Admins manage banners"
    ON public.library_banners FOR ALL
    USING (public.is_admin())
    WITH CHECK (public.is_admin());
