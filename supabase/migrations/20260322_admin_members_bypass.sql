-- Permitir que o Painel de Administração aceda a todos os membros das casas
-- Este código corrige o problema de Parceiros "Indefinidos" nas Verificações

DROP POLICY IF EXISTS "Admins bypass RLS members" ON public.members;
CREATE POLICY "Admins bypass RLS members" 
    ON public.members 
    FOR ALL 
    USING (public.is_admin());

DROP POLICY IF EXISTS "Admins bypass RLS identity_verifications" ON public.identity_verifications;
CREATE POLICY "Admins bypass RLS identity_verifications" 
    ON public.identity_verifications 
    FOR ALL 
    USING (public.is_admin());
