-- ══════════════════════════════════════════════════════════════════
-- BIBLIOTECA — Progresso de leitura partilhado (por utilizador, por livro)
-- ══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.book_reading_progress (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    couple_space_id  uuid NOT NULL REFERENCES public.couple_spaces(id) ON DELETE CASCADE,
    book_id          uuid NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
    user_id          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    progress_percent integer NOT NULL DEFAULT 0 CHECK (progress_percent BETWEEN 0 AND 100),
    location         text,
    completed_at     timestamptz,
    created_at       timestamptz NOT NULL DEFAULT now(),
    updated_at       timestamptz NOT NULL DEFAULT now(),
    UNIQUE (book_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_book_reading_progress_couple ON public.book_reading_progress(couple_space_id, book_id);

ALTER TABLE public.book_reading_progress ENABLE ROW LEVEL SECURITY;

-- Ambos os membros do casal veem o progresso um do outro no mesmo livro.
CREATE POLICY "Couple members view reading progress"
    ON public.book_reading_progress FOR SELECT
    USING (public.is_member_of_couple_space(couple_space_id) OR public.is_admin());

-- Cada membro só pode escrever o seu próprio progresso.
CREATE POLICY "Members write own reading progress"
    ON public.book_reading_progress FOR INSERT
    WITH CHECK (auth.uid() = user_id AND public.is_member_of_couple_space(couple_space_id));

CREATE POLICY "Members update own reading progress"
    ON public.book_reading_progress FOR UPDATE
    USING (auth.uid() = user_id AND public.is_member_of_couple_space(couple_space_id))
    WITH CHECK (auth.uid() = user_id AND public.is_member_of_couple_space(couple_space_id));

CREATE POLICY "Admins manage reading progress"
    ON public.book_reading_progress FOR ALL
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

DROP TRIGGER IF EXISTS update_book_reading_progress_updated_at ON public.book_reading_progress;
CREATE TRIGGER update_book_reading_progress_updated_at
    BEFORE UPDATE ON public.book_reading_progress
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

NOTIFY pgrst, 'reload schema';
