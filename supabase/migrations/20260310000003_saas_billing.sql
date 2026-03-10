-- 20260310000003_saas_billing_and_viral.sql

-- 1. Update Existing Tables
ALTER TABLE public.houses 
    ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'trial',
    ADD COLUMN IF NOT EXISTS streak_count INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS last_streak_date DATE;

ALTER TABLE public.subscription_plans 
    ADD COLUMN IF NOT EXISTS billing_type TEXT DEFAULT 'one_time';

-- 2. Create Payments History Table
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    house_id UUID REFERENCES public.houses(id) ON DELETE CASCADE NOT NULL,
    plan_name TEXT NOT NULL,
    amount TEXT NOT NULL,
    method TEXT NOT NULL,
    proof_url TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for payments
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "House members can view their own payments" ON public.payments;
CREATE POLICY "House members can view their own payments" 
    ON public.payments 
    FOR SELECT 
    USING (house_id IN (
        SELECT house_id 
        FROM public.house_members 
        WHERE user_id = auth.uid()
    ));

DROP POLICY IF EXISTS "House members can insert payments" ON public.payments;
CREATE POLICY "House members can insert payments" 
    ON public.payments 
    FOR INSERT 
    WITH CHECK (house_id IN (
        SELECT house_id 
        FROM public.house_members 
        WHERE user_id = auth.uid()
    ));

-- 3. Create Couple Challenges Table
CREATE TABLE IF NOT EXISTS public.couple_challenges (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    house_id UUID REFERENCES public.houses(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    is_completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for challenges
ALTER TABLE public.couple_challenges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "House members can view their challenges" ON public.couple_challenges;
CREATE POLICY "House members can view their challenges" 
    ON public.couple_challenges 
    FOR SELECT 
    USING (house_id IN (
        SELECT house_id 
        FROM public.house_members 
        WHERE user_id = auth.uid()
    ));

DROP POLICY IF EXISTS "House members can insert challenges" ON public.couple_challenges;
CREATE POLICY "House members can insert challenges" 
    ON public.couple_challenges 
    FOR INSERT 
    WITH CHECK (house_id IN (
        SELECT house_id 
        FROM public.house_members 
        WHERE user_id = auth.uid()
    ));

DROP POLICY IF EXISTS "House members can update challenges" ON public.couple_challenges;
CREATE POLICY "House members can update challenges" 
    ON public.couple_challenges 
    FOR UPDATE 
    USING (house_id IN (
        SELECT house_id 
        FROM public.house_members 
        WHERE user_id = auth.uid()
    ));

-- 4. Create Time Capsule Messages Table
CREATE TABLE IF NOT EXISTS public.time_capsule_messages (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    house_id UUID REFERENCES public.houses(id) ON DELETE CASCADE NOT NULL,
    creator_id UUID REFERENCES auth.users(id) NOT NULL,
    message TEXT NOT NULL,
    image_url TEXT,
    unlock_date TIMESTAMP WITH TIME ZONE NOT NULL,
    is_unlocked BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for time capsule
ALTER TABLE public.time_capsule_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "House members can view their time capsules" ON public.time_capsule_messages;
CREATE POLICY "House members can view their time capsules" 
    ON public.time_capsule_messages 
    FOR SELECT 
    USING (house_id IN (
        SELECT house_id 
        FROM public.house_members 
        WHERE user_id = auth.uid()
    ));

DROP POLICY IF EXISTS "House members can insert time capsules" ON public.time_capsule_messages;
CREATE POLICY "House members can insert time capsules" 
    ON public.time_capsule_messages 
    FOR INSERT 
    WITH CHECK (
        house_id IN (
            SELECT house_id 
            FROM public.house_members 
            WHERE user_id = auth.uid()
        ) AND creator_id = auth.uid()
    );

DROP POLICY IF EXISTS "House members can update time capsules" ON public.time_capsule_messages;
CREATE POLICY "House members can update time capsules" 
    ON public.time_capsule_messages 
    FOR UPDATE 
    USING (house_id IN (
        SELECT house_id 
        FROM public.house_members 
        WHERE user_id = auth.uid()
    ));
