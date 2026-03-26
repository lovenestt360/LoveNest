-- SCRIPT PARA CORRIGIR O UPLOAD DE ÁUDIOS E IMAGENS DO CHAT
-- Resolve o erro: "new row violates row-level security policy"
-- O erro acontecia porque as regras do bucket "chat-media" foram apagadas.

-- 1. Garante que o bucket existe e é público (para leres o conteúdo na app)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('chat-media', 'chat-media', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Limpa quaisquer regras antigas/estragadas
DROP POLICY IF EXISTS "Couple members can upload chat media" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view chat media" ON storage.objects;
DROP POLICY IF EXISTS "Owner can delete chat media" ON storage.objects;

-- 3. PERMISSÕES DE UPLOAD (A CAUSA DO ERRO)
-- Permite que utilizadores autenticados enviem ficheiros para a sua própria pasta (onde o nome da pasta = o seu ID de utilizador)
CREATE POLICY "Couple members can upload chat media" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
    bucket_id = 'chat-media' AND 
    auth.uid()::text = (storage.foldername(name))[1]
);

-- 4. PERMISSÕES DE LEITURA (Para os áudios e imagens carregarem na página do chat)
CREATE POLICY "Anyone can view chat media" ON storage.objects
FOR SELECT
USING (bucket_id = 'chat-media');

-- 5. PERMISSÕES DE APAGAR (Apenas o dono pode apagar os ficheiros que enviou)
CREATE POLICY "Owner can delete chat media" ON storage.objects
FOR DELETE TO authenticated
USING (
    bucket_id = 'chat-media' AND 
    auth.uid()::text = (storage.foldername(name))[1]
);

DO $$ BEGIN RAISE NOTICE 'Permissões do Chat Media Restauradas com Sucesso!'; END $$;
