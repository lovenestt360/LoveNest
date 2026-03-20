-- ============================================================
-- FIX: Políticas de Storage para Upload de Avatares
-- Cole este script no SQL Editor do Supabase e clique em Run
-- ============================================================

-- 1. Garantir que o bucket avatars existe e é público
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Limpar políticas antigas para evitar conflitos
DROP POLICY IF EXISTS "Avatar read access" ON storage.objects;
DROP POLICY IF EXISTS "Avatar upload access" ON storage.objects;
DROP POLICY IF EXISTS "Avatar update access" ON storage.objects;
DROP POLICY IF EXISTS "Avatar delete access" ON storage.objects;
DROP POLICY IF EXISTS "Give users access to own folder" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Public read avatars" ON storage.objects;

-- 3. Leitura pública (qualquer pessoa pode ver avatares)
CREATE POLICY "Public read avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- 4. Utilizadores autenticados podem fazer upload na sua pasta
CREATE POLICY "Authenticated users can upload avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'avatars');

-- 5. Utilizadores podem atualizar os seus ficheiros
CREATE POLICY "Authenticated users can update avatars"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'avatars');

-- 6. Utilizadores podem apagar os seus ficheiros
CREATE POLICY "Authenticated users can delete avatars"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'avatars');
