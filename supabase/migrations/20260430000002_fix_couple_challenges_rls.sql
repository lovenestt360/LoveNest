-- Fix RLS policies on couple_challenges
-- Replace is_member_of_couple_space() with inline EXISTS (same fix applied to complaints)

DROP POLICY IF EXISTS "House members can view their challenges" ON public.couple_challenges;
CREATE POLICY "Members can view their challenges"
    ON public.couple_challenges
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.members
            WHERE members.couple_space_id = couple_challenges.couple_space_id
            AND members.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "House members can insert challenges" ON public.couple_challenges;
CREATE POLICY "Members can insert challenges"
    ON public.couple_challenges
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.members
            WHERE members.couple_space_id = couple_challenges.couple_space_id
            AND members.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "House members can update challenges" ON public.couple_challenges;
CREATE POLICY "Members can update challenges"
    ON public.couple_challenges
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.members
            WHERE members.couple_space_id = couple_challenges.couple_space_id
            AND members.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "House members can delete challenges" ON public.couple_challenges;
CREATE POLICY "Members can delete challenges"
    ON public.couple_challenges
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.members
            WHERE members.couple_space_id = couple_challenges.couple_space_id
            AND members.user_id = auth.uid()
        )
    );
