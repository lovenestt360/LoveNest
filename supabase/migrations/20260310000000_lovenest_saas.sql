-- LoveNest SaaS Schema Additions

-- 1. Create Houses table
CREATE TABLE IF NOT EXISTS public.houses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    house_name TEXT,
    partner1_name TEXT,
    partner2_name TEXT,
    initials TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create House Members table
CREATE TABLE IF NOT EXISTS public.house_members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    house_id UUID NOT NULL REFERENCES public.houses(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'member', -- e.g., 'owner', 'member'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, house_id)
);

-- 3. Create Subscriptions table
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    house_id UUID NOT NULL REFERENCES public.houses(id) ON DELETE CASCADE,
    plan TEXT NOT NULL DEFAULT 'LoveNest Lifetime',
    paid BOOLEAN DEFAULT false,
    payment_method TEXT, -- e.g., 'M-Pesa', 'e-Mola', 'mKesh'
    payment_proof_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(house_id)
);

-- Enable RLS
ALTER TABLE public.houses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.house_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Policies for Houses
CREATE POLICY "Users can view their own houses based on membership"
    ON public.houses FOR SELECT
    USING (
        id IN (
            SELECT house_id FROM public.house_members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert their own houses"
    ON public.houses FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Users can update their own houses"
    ON public.houses FOR UPDATE
    USING (
        id IN (
            SELECT house_id FROM public.house_members WHERE user_id = auth.uid()
        )
    );

-- Policies for House Members
CREATE POLICY "Users can view members of their houses"
    ON public.house_members FOR SELECT
    USING (
        house_id IN (
            SELECT house_id FROM public.house_members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert house_members"
    ON public.house_members FOR INSERT
    WITH CHECK (
        user_id = auth.uid()
    );

-- Policies for Subscriptions
CREATE POLICY "Users can view their house subscription"
    ON public.subscriptions FOR SELECT
    USING (
        house_id IN (
            SELECT house_id FROM public.house_members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert their house subscription"
    ON public.subscriptions FOR INSERT
    WITH CHECK (
        house_id IN (
            SELECT house_id FROM public.house_members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their house subscription"
    ON public.subscriptions FOR UPDATE
    USING (
        house_id IN (
            SELECT house_id FROM public.house_members WHERE user_id = auth.uid()
        )
    );
