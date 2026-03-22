-- MIGRATION: FIX IDENTITY VERIFICATION & ADMIN RLS
-- Descrição: Adiciona colunas em falta e configura bypass de RLS para o Admin.

-- 1. Garantir colunas para upload dual (Frente/Verso e Tipo)
ALTER TABLE public.identity_verifications 
ADD COLUMN IF NOT EXISTS document_type TEXT DEFAULT 'bi',
ADD COLUMN IF NOT EXISTS document_back_url TEXT;

-- 2. Limpeza de políticas obsoletas
DROP POLICY IF EXISTS "Users can insert own verification" ON public.identity_verifications;
DROP POLICY IF EXISTS "Users can view own verification" ON public.identity_verifications;
DROP POLICY IF EXISTS "Admins can manage all verifications" ON public.identity_verifications;
DROP POLICY IF EXISTS "Allow users to insert own verification" ON public.identity_verifications;
DROP POLICY IF EXISTS "Allow users to view own verification" ON public.identity_verifications;
DROP POLICY IF EXISTS "Admins bypass RLS identity_verifications" ON public.identity_verifications;

-- 3. Política de Inserção para Utilizadores
CREATE POLICY "Users can insert own verification"
ON public.identity_verifications FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 4. Política de Visualização para Utilizadores
CREATE POLICY "Users can view own verification"
ON public.identity_verifications FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 5. Política de Bypass para Administração (is_admin() herança)
CREATE POLICY "Admins bypass RLS identity_verifications" 
ON public.identity_verifications 
FOR ALL 
TO anon, authenticated
USING (public.is_admin());

-- 6. Política de Storage para Admins (Acesso aos documentos)
DROP POLICY IF EXISTS "Admins can view all identity documents" ON storage.objects;
CREATE POLICY "Admins can view all identity documents"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'identity-documents' AND public.is_admin());

-- 7. Permissões globais para roles anónimas e autenticadas
GRANT ALL ON public.identity_verifications TO anon;
GRANT ALL ON public.identity_verifications TO authenticated;
GRANT ALL ON public.identity_verifications TO service_role;
