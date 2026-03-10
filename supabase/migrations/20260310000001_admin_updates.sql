-- Admin Panel SaaS Upgrades

-- 1. Add suspended state to houses
ALTER TABLE public.houses ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN DEFAULT false;

-- 2. Create Announcements table
CREATE TABLE IF NOT EXISTS public.admin_announcements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Note: In a real system, you'd add RLS ensuring only Admins can INSERT/UPDATE,
-- and everyone can SELECT where active=true. For this SaaS demo, we'll keep SELECT open.
ALTER TABLE public.admin_announcements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Everyone can view active announcements" ON public.admin_announcements;
CREATE POLICY "Everyone can view active announcements"
    ON public.admin_announcements FOR SELECT
    USING (active = true);

-- Allowing insert/update broadly for demo Admin functionality. 
-- In production, tie this to user role or specific UUID.
DROP POLICY IF EXISTS "Admins can manage announcements" ON public.admin_announcements;
CREATE POLICY "Admins can manage announcements"
    ON public.admin_announcements FOR ALL
    USING (true)
    WITH CHECK (true);
