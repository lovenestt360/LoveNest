-- ============================================================
-- FIX: Robustez de Códigos de Convite (Referral & House)
-- Cole este script no SQL Editor do Supabase e clique em Run
-- ============================================================

-- 1. Função para gerar códigos aleatórios (8 caracteres alfanuméricos)
CREATE OR REPLACE FUNCTION generate_unique_referral_code()
RETURNS TEXT AS $$
DECLARE
  new_code TEXT;
  done BOOL;
BEGIN
  done := false;
  WHILE NOT done LOOP
    new_code := UPPER(SUBSTRING(md5(random()::text) FROM 1 FOR 8));
    SELECT NOT EXISTS (SELECT 1 FROM profiles WHERE referral_code = new_code) INTO done;
  END LOOP;
  RETURN new_code;
END;
$$ LANGUAGE plpgsql VOLATILE;

-- 2. Trigger para garantir que cada perfil tem um referral_code único ao ser criado
-- E também processar indicação se vier do metadata do Auth
CREATE OR REPLACE FUNCTION trigger_handle_new_profile()
RETURNS TRIGGER AS $$
DECLARE
  ref_code TEXT;
  referrer_id UUID;
BEGIN
  -- 1. Garantir referral_code para o novo usuário
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := generate_unique_referral_code();
  END IF;

  -- 2. Processar quem indicou (vindo do Auth metadata)
  SELECT (raw_user_meta_data->>'referred_by_code') INTO ref_code
  FROM auth.users WHERE id = NEW.user_id;

  IF ref_code IS NOT NULL AND ref_code <> '' THEN
    SELECT user_id INTO referrer_id FROM public.profiles WHERE referral_code = ref_code;
    
    -- Se encontrou o padrinho, insere na tabela de indicações
    IF referrer_id IS NOT NULL AND referrer_id <> NEW.user_id THEN
      INSERT INTO public.referrals (referrer_user_id, new_user_id)
      VALUES (referrer_id, NEW.user_id)
      ON CONFLICT (new_user_id) DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_profile_created ON public.profiles;
CREATE TRIGGER on_profile_created
BEFORE INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION trigger_handle_new_profile();

-- 3. Gerar códigos para quem ainda não tem
UPDATE public.profiles 
SET referral_code = generate_unique_referral_code() 
WHERE referral_code IS NULL;

-- 4. Garantir que a tabela referrals está correta (Super verificação)
CREATE TABLE IF NOT EXISTS public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  new_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  points_awarded boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(new_user_id) -- Um usuário só pode ser indicado uma vez
);

-- Habilitar RLS se não estiver
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own referrals" ON public.referrals;
CREATE POLICY "Users can view their own referrals" 
ON public.referrals FOR SELECT 
USING (auth.uid() = referrer_user_id OR auth.uid() = new_user_id);

