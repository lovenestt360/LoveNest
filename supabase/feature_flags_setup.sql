-- Create Feature Flags table
CREATE TABLE IF NOT EXISTS public.feature_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT NOT NULL,
    enabled BOOLEAN DEFAULT true,
    scope TEXT NOT NULL CHECK (scope IN ('global', 'couple', 'user')),
    target_id UUID, -- Can be a couple_space_id or a user_id
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(key, scope, target_id)
);

-- Enable RLS
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

-- Policy for Admin (service_role has full access, but we add a custom policy if needed)
CREATE POLICY "Admins have full access to feature_flags" 
ON public.feature_flags 
FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);

-- Optional: Allow users to READ global flags (not strictly necessary if using useFeatureAccess with service_role)
CREATE POLICY "Anyone can read feature_flags" 
ON public.feature_flags 
FOR SELECT 
TO authenticated 
USING (true);

-- Add some default flags for testing
INSERT INTO public.feature_flags (key, scope, enabled) VALUES 
('home_memories', 'global', true),
('home_capsula', 'global', true),
('home_desafios', 'global', true),
('home_oracao', 'global', true),
('home_wrapped', 'global', true),
('home_jejum', 'global', true),
('home_conversas', 'global', true)
ON CONFLICT DO NOTHING;
