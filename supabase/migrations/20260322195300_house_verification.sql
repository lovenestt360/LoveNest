-- MIGRATION: ADD HOUSE VERIFICATION SEAL
-- Descrição: Adiciona o campo is_verified às casas para permitir o selo de confiança.

ALTER TABLE public.couple_spaces 
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;

-- Permitir que Admins atualizem este campo
DROP POLICY IF EXISTS "Admins can update couple_spaces" ON public.couple_spaces;
CREATE POLICY "Admins can update couple_spaces"
ON public.couple_spaces FOR UPDATE
TO anon, authenticated
USING (public.is_admin());
