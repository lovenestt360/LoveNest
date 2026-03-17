-- Fix missing RLS policies for Streaks and Routines
-- Ensure members can access their own data

-- 1. Love Streaks
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'love_streaks' AND policyname = 'Members can manage love_streaks'
    ) THEN
        CREATE POLICY "Members can manage love_streaks" ON public.love_streaks 
        FOR ALL USING (public.is_member_of_couple_space(couple_space_id));
    END IF;
END $$;

-- 2. Routines (these don't have couple_space_id directly in some cases, or they do?)
-- Let's check the schema for routines again.
-- public.routines has couple_space_id
-- public.routine_items refers to routines
-- public.routine_logs refers to routine_items

DO $$ 
BEGIN
    -- routines
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'routines' AND policyname = 'Members can manage routines') THEN
        CREATE POLICY "Members can manage routines" ON public.routines 
        FOR ALL USING (public.is_member_of_couple_space(couple_space_id));
    END IF;

    -- routine_items (nested, need a helper or subquery)
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'routine_items' AND policyname = 'Members can manage routine_items') THEN
        CREATE POLICY "Members can manage routine_items" ON public.routine_items 
        FOR ALL USING (
            EXISTS (
                SELECT 1 FROM public.routines r 
                WHERE r.id = routine_items.routine_id 
                AND public.is_member_of_couple_space(r.couple_space_id)
            )
        );
    END IF;

    -- routine_logs
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'routine_logs' AND policyname = 'Members can manage routine_logs') THEN
        CREATE POLICY "Members can manage routine_logs" ON public.routine_logs 
        FOR ALL USING (
            EXISTS (
                SELECT 1 FROM public.routine_items ri
                JOIN public.routines r ON r.id = ri.routine_id
                WHERE ri.id = routine_logs.item_id
                AND public.is_member_of_couple_space(r.couple_space_id)
            )
        );
    END IF;
END $$;

-- 3. Micro Challenges (Parent table needs select access for all)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'micro_challenges' AND policyname = 'Anyone can view micro challenges') THEN
        CREATE POLICY "Anyone can view micro challenges" ON public.micro_challenges 
        FOR SELECT USING (true);
    END IF;
END $$;
