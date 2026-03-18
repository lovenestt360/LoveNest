-- 2026.03.17 - Fix Free Mode RLS and Persistence
-- This script allows public select on app_settings and ensures is_admin() works correctly for these settings.

-- 1. Update SELECT policy to be PUBLIC (so admin via x-admin-id or anyone can read global flags)
DROP POLICY IF EXISTS "Anyone can view app settings" ON public.app_settings;
CREATE POLICY "Anyone can view app settings" 
    ON public.app_settings FOR SELECT 
    USING (true);

-- 2. Ensure only Admins can modify
DROP POLICY IF EXISTS "Admins can manage app settings" ON public.app_settings;
CREATE POLICY "Admins can manage app settings" 
    ON public.app_settings FOR ALL 
    TO public 
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- 3. Update logs policy specifically for is_admin check
DROP POLICY IF EXISTS "Admins can manage free mode logs" ON public.free_mode_logs;
CREATE POLICY "Admins can manage free mode logs" 
    ON public.free_mode_logs FOR ALL 
    TO public 
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- 4. Re-ensure the free_mode key exists for the first toggle
INSERT INTO public.app_settings (key, value) 
VALUES ('free_mode', 'false')
ON CONFLICT (key) DO NOTHING;
