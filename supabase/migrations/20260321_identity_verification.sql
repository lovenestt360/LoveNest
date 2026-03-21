-- MIGRATION: IDENTITY VERIFICATION SYSTEM (KYC-LITE)
-- Descrição: Adiciona suporte para verificação de identidade opcional.

-- 1. Tabelas e Colunas de Perfil
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS verification_status text DEFAULT 'unverified',
ADD COLUMN IF NOT EXISTS age integer;

-- 2. Tabela de Espaços para Flag de Diferença de Idade
ALTER TABLE public.couple_spaces
ADD COLUMN IF NOT EXISTS age_gap_flag boolean DEFAULT false;

-- 3. Nova Tabela: identity_verifications
CREATE TABLE IF NOT EXISTS public.identity_verifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name text NOT NULL,
    age integer NOT NULL,
    id_number text NOT NULL,
    document_url text NOT NULL,
    status text NOT NULL DEFAULT 'pending',
    admin_notes text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Ativar RLS
ALTER TABLE public.identity_verifications ENABLE ROW LEVEL SECURITY;

-- 4. Políticas RLS para identity_verifications
-- Utilizadores podem ver e inserir as suas próprias submissões
CREATE POLICY "Users can view own verification"
ON public.identity_verifications FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own verification"
ON public.identity_verifications FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Admins podem fazer tudo
-- (Assumindo que temos um check de admin, vou usar service_role ou um helper se existir)
-- Se não houver helper, usaremos a lógica de admin_users se existir
CREATE POLICY "Admins can manage all verifications"
ON public.identity_verifications FOR ALL
TO authenticated
USING (EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid()));

-- 5. Armazenamento (Storage)
-- Criar bucket se não existir
INSERT INTO storage.buckets (id, name, public) 
VALUES ('identity-documents', 'identity-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Políticas de Storage para identity-documents
CREATE POLICY "Users can upload own identity documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'identity-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can view own identity documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'identity-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Admins can view all identity documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'identity-documents' AND EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid()));

-- 6. Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_identity_verifications_updated_at
    BEFORE UPDATE ON public.identity_verifications
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();
