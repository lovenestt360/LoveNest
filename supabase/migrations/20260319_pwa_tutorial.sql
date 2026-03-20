-- Create PWA Tutorial Settings table
CREATE TABLE IF NOT EXISTS public.pwa_tutorial_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    android_video_url TEXT,
    ios_video_url TEXT,
    is_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pwa_tutorial_settings ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read settings
CREATE POLICY "Allow authenticated to read pwa settings" 
ON public.pwa_tutorial_settings FOR SELECT 
TO authenticated 
USING (true);

-- Allow admins to update settings 
-- (Assuming there is an admin check function or table, using the existing patterns)
CREATE POLICY "Allow admins to update pwa settings" 
ON public.pwa_tutorial_settings FOR UPDATE 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.admin_users 
        WHERE user_id = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.admin_users 
        WHERE user_id = auth.uid()
    )
);

-- Insert a default row if not exists
INSERT INTO public.pwa_tutorial_settings (android_video_url, ios_video_url, is_enabled)
SELECT '', '', true
WHERE NOT EXISTS (SELECT 1 FROM public.pwa_tutorial_settings);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_pwa_settings_updated_at
BEFORE UPDATE ON public.pwa_tutorial_settings
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();
