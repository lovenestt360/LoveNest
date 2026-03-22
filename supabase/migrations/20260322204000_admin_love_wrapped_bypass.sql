-- Allow Admin Panel to bypass RLS for love_wrapped table
DROP POLICY IF EXISTS "Admins bypass RLS love_wrapped" ON public.love_wrapped;
CREATE POLICY "Admins bypass RLS love_wrapped" 
    ON public.love_wrapped 
    FOR ALL 
    USING (public.is_admin());

-- Ensure other related tables also have admin bypass if needed
DROP POLICY IF EXISTS "Admins bypass RLS love_streaks" ON public.love_streaks;
CREATE POLICY "Admins bypass RLS love_streaks" 
    ON public.love_streaks 
    FOR ALL 
    USING (public.is_admin());

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
