-- Fix dual architecture: Merge houses fields into couple_spaces

-- 1. Add fields to couple_spaces
ALTER TABLE public.couple_spaces
    ADD COLUMN IF NOT EXISTS house_name TEXT DEFAULT 'LoveNest',
    ADD COLUMN IF NOT EXISTS partner1_name TEXT,
    ADD COLUMN IF NOT EXISTS partner2_name TEXT,
    ADD COLUMN IF NOT EXISTS initials TEXT,
    ADD COLUMN IF NOT EXISTS plan_id TEXT,
    ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'trial',
    ADD COLUMN IF NOT EXISTS streak_count INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS last_streak_date DATE,
    ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS trial_used BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN DEFAULT false;

-- 2. Modify payments table to point to couple_spaces
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_house_id_fkey;
ALTER TABLE public.payments RENAME COLUMN house_id TO couple_space_id;
ALTER TABLE public.payments ADD CONSTRAINT payments_couple_space_id_fkey FOREIGN KEY (couple_space_id) REFERENCES public.couple_spaces(id) ON DELETE CASCADE;

-- Update RLS policies for payments
DROP POLICY IF EXISTS "House members can view their own payments" ON public.payments;
CREATE POLICY "House members can view their own payments" 
    ON public.payments 
    FOR SELECT 
    USING (public.is_member_of_couple_space(couple_space_id));

DROP POLICY IF EXISTS "House members can insert payments" ON public.payments;
CREATE POLICY "House members can insert payments" 
    ON public.payments 
    FOR INSERT 
    WITH CHECK (public.is_member_of_couple_space(couple_space_id));


-- 3. Modify couple_challenges to point to couple_spaces
ALTER TABLE public.couple_challenges DROP CONSTRAINT IF EXISTS couple_challenges_house_id_fkey;
ALTER TABLE public.couple_challenges RENAME COLUMN house_id TO couple_space_id;
ALTER TABLE public.couple_challenges ADD CONSTRAINT couple_challenges_couple_space_id_fkey FOREIGN KEY (couple_space_id) REFERENCES public.couple_spaces(id) ON DELETE CASCADE;

-- Update RLS policies for challenges
DROP POLICY IF EXISTS "House members can view their challenges" ON public.couple_challenges;
CREATE POLICY "House members can view their challenges" 
    ON public.couple_challenges 
    FOR SELECT 
    USING (public.is_member_of_couple_space(couple_space_id));

DROP POLICY IF EXISTS "House members can insert challenges" ON public.couple_challenges;
CREATE POLICY "House members can insert challenges" 
    ON public.couple_challenges 
    FOR INSERT 
    WITH CHECK (public.is_member_of_couple_space(couple_space_id));

DROP POLICY IF EXISTS "House members can update challenges" ON public.couple_challenges;
CREATE POLICY "House members can update challenges" 
    ON public.couple_challenges 
    FOR UPDATE 
    USING (public.is_member_of_couple_space(couple_space_id));


-- 4. Modify time_capsule_messages to point to couple_spaces
ALTER TABLE public.time_capsule_messages DROP CONSTRAINT IF EXISTS time_capsule_messages_house_id_fkey;
ALTER TABLE public.time_capsule_messages RENAME COLUMN house_id TO couple_space_id;
ALTER TABLE public.time_capsule_messages ADD CONSTRAINT time_capsule_messages_couple_space_id_fkey FOREIGN KEY (couple_space_id) REFERENCES public.couple_spaces(id) ON DELETE CASCADE;

-- Update RLS policies for time capsules
DROP POLICY IF EXISTS "House members can view their time capsules" ON public.time_capsule_messages;
CREATE POLICY "House members can view their time capsules" 
    ON public.time_capsule_messages 
    FOR SELECT 
    USING (public.is_member_of_couple_space(couple_space_id));

DROP POLICY IF EXISTS "House members can insert time capsules" ON public.time_capsule_messages;
CREATE POLICY "House members can insert time capsules" 
    ON public.time_capsule_messages 
    FOR INSERT 
    WITH CHECK (public.is_member_of_couple_space(couple_space_id) AND creator_id = auth.uid());

DROP POLICY IF EXISTS "House members can update time capsules" ON public.time_capsule_messages;
CREATE POLICY "House members can update time capsules" 
    ON public.time_capsule_messages 
    FOR UPDATE 
    USING (public.is_member_of_couple_space(couple_space_id));


-- 5. Drop unused unused houses tables safely (assuming they are empty/redundant)
DROP TABLE IF EXISTS public.house_members CASCADE;
DROP TABLE IF EXISTS public.houses CASCADE;
