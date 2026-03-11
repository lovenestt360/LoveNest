-- Allow Admin Panel to bypass RLS by detecting a custom header 'x-admin-id' passed by the frontend

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE id::text = current_setting('request.headers', true)::json->>'x-admin-id'
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add bypass policies to heavily protected tables
DROP POLICY IF EXISTS "Admins bypass RLS couple_spaces" ON public.couple_spaces;
CREATE POLICY "Admins bypass RLS couple_spaces" 
    ON public.couple_spaces 
    FOR ALL 
    USING (public.is_admin());

DROP POLICY IF EXISTS "Admins bypass RLS payments" ON public.payments;
CREATE POLICY "Admins bypass RLS payments" 
    ON public.payments 
    FOR ALL 
    USING (public.is_admin());

DROP POLICY IF EXISTS "Admins bypass RLS profiles" ON public.profiles;
CREATE POLICY "Admins bypass RLS profiles" 
    ON public.profiles 
    FOR ALL 
    USING (public.is_admin());
