-- 2026.03.17 - ULTIMATE FIX for Free Mode RLS
-- This script makes is_admin() robust to header casing and fixes all RLS issues.

-- 1. Make is_admin() robust
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  headers json;
  admin_id text;
BEGIN
  -- Get headers, handling cases where it might be null or empty
  BEGIN
    headers := current_setting('request.headers', true)::json;
  EXCEPTION WHEN OTHERS THEN
    RETURN FALSE;
  END;

  IF headers IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Check common header variations
  admin_id := COALESCE(
    headers->>'x-admin-id',
    headers->>'X-Admin-Id',
    headers->>'x_admin_id',
    headers->>'X_Admin_Id'
  );
  
  IF admin_id IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE id::text = admin_id
  );
END;
$$;

-- 2. Setup app_settings permissions (Public Read, Admin Write)
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view app settings" ON public.app_settings;
CREATE POLICY "Anyone can view app settings" 
    ON public.app_settings FOR SELECT 
    USING (true);

DROP POLICY IF EXISTS "Admins can manage app settings" ON public.app_settings;
CREATE POLICY "Admins can manage app settings" 
    ON public.app_settings FOR ALL 
    TO public 
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- 3. Setup free_mode_logs permissions (Admin Write)
ALTER TABLE public.free_mode_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage free mode logs" ON public.free_mode_logs;
CREATE POLICY "Admins can manage free mode logs" 
    ON public.free_mode_logs FOR ALL 
    TO public 
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- 4. Ensure initial data
INSERT INTO public.app_settings (key, value) 
VALUES ('free_mode', 'false')
ON CONFLICT (key) DO NOTHING;

-- 5. Grant permissions to roles just in case
GRANT SELECT ON public.app_settings TO anon, authenticated;
GRANT ALL ON public.app_settings TO anon, authenticated;
GRANT ALL ON public.free_mode_logs TO anon, authenticated;
