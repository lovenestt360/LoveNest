-- ============================================================
-- FIX: Políticas de Storage para Upload de Vídeos PWA
-- Cole este script no SQL Editor do Supabase e clique em Run
-- ============================================================

-- 1. Criar bucket dedicado para tutoriais (público para leitura)
INSERT INTO storage.buckets (id, name, public)
VALUES ('pwa-tutorials', 'pwa-tutorials', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Permitir que QUALQUER pessoa leia os vídeos (público)
CREATE POLICY "Public read pwa tutorials"
ON storage.objects FOR SELECT
USING (bucket_id = 'pwa-tutorials');

-- 3. Permitir upload sem restrições (admin vai usar isto)
CREATE POLICY "Allow upload to pwa tutorials"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'pwa-tutorials');

-- 4. Permitir update/upsert
CREATE POLICY "Allow update pwa tutorials"
ON storage.objects FOR UPDATE
USING (bucket_id = 'pwa-tutorials');

-- 5. Permitir delete
CREATE POLICY "Allow delete pwa tutorials"
ON storage.objects FOR DELETE
USING (bucket_id = 'pwa-tutorials');
