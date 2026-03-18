-- Robust fix for Admin RLS Bypass
-- This improves the is_admin function to be more resilient and ensures all policies are correctly applied

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
DECLARE
  v_headers text;
  v_admin_id text;
BEGIN
  -- 1. Try to get headers from the current request context
  v_headers := current_setting('request.headers', true);
  
  -- If headers are empty, we are not an admin (or not a web request)
  IF v_headers IS NULL OR v_headers = '' THEN
    RETURN FALSE;
  END IF;

  -- 2. Extract x-admin-id safely from the JSON string
  BEGIN
    v_admin_id := v_headers::json->>'x-admin-id';
  EXCEPTION WHEN OTHERS THEN
    -- If parsing fails, it might be due to a complex header string, but we can't do much here
    RETURN FALSE;
  END;

  -- 3. Check if the extracted ID exists in the admin_users table
  IF v_admin_id IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE id::text = v_admin_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-apply policies to ensure they are using the latest function logic
-- FOR PROFILES
DROP POLICY IF EXISTS "Admins bypass RLS profiles" ON public.profiles;
CREATE POLICY "Admins bypass RLS profiles" 
    ON public.profiles 
    FOR ALL 
    USING (public.is_admin());

-- FOR COUPLE_SPACES
DROP POLICY IF EXISTS "Admins bypass RLS couple_spaces" ON public.couple_spaces;
CREATE POLICY "Admins bypass RLS couple_spaces" 
    ON public.couple_spaces 
    FOR ALL 
    USING (public.is_admin());

-- FOR PAYMENTS
DROP POLICY IF EXISTS "Admins bypass RLS payments" ON public.payments;
CREATE POLICY "Admins bypass RLS payments" 
    ON public.payments 
    FOR ALL 
    USING (public.is_admin());
    
-- FOR LOVE_STREAKS (Important to see rankings)
DROP POLICY IF EXISTS "Admins bypass RLS streaks" ON public.love_streaks;
CREATE POLICY "Admins bypass RLS streaks" 
    ON public.love_streaks 
    FOR ALL 
    USING (public.is_admin());
