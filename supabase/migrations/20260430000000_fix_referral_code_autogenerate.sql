-- ============================================================
-- Fix: gerar referral_code automaticamente para novos utilizadores
--
-- Problema: handle_new_user criava o profile sem referral_code,
-- deixando utilizadores registados após a migração inicial sem
-- código de convite — campo ficava NULL na Settings e Index.
-- ============================================================

-- 1. Actualizar handle_new_user para incluir referral_code no INSERT
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_existing_user_id uuid;
  v_display_name     text;
  v_avatar_url       text;
  v_referral_code    text;
BEGIN
  v_display_name := COALESCE(
    NEW.raw_user_meta_data->>'display_name',
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    split_part(NEW.email, '@', 1)
  );
  v_avatar_url := NEW.raw_user_meta_data->>'avatar_url';

  -- Gerar código único de 8 caracteres alfanuméricos maiúsculos
  LOOP
    v_referral_code := UPPER(SUBSTRING(md5(random()::text || NEW.id::text || now()::text), 1, 8));
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM public.profiles WHERE referral_code = v_referral_code
    );
  END LOOP;

  -- Criar/actualizar profile (inclui referral_code apenas no INSERT)
  INSERT INTO public.profiles (user_id, display_name, avatar_url, referral_code)
  VALUES (NEW.id, v_display_name, v_avatar_url, v_referral_code)
  ON CONFLICT (user_id) DO UPDATE
    SET display_name  = COALESCE(EXCLUDED.display_name, profiles.display_name),
        avatar_url    = COALESCE(EXCLUDED.avatar_url, profiles.avatar_url),
        referral_code = COALESCE(profiles.referral_code, EXCLUDED.referral_code);

  -- Só para OAuth (Google, etc.): se existe outra conta com o mesmo email
  -- que JÁ está num casal, transferir a membership para o novo UUID.
  IF COALESCE(NEW.raw_app_meta_data->>'provider', 'email') != 'email' THEN
    SELECT au.id INTO v_existing_user_id
    FROM auth.users au
    INNER JOIN public.members m ON m.user_id = au.id
    WHERE au.email = NEW.email
      AND au.id != NEW.id
    LIMIT 1;

    IF v_existing_user_id IS NOT NULL THEN
      UPDATE public.members
      SET user_id = NEW.id
      WHERE user_id = v_existing_user_id;

      UPDATE public.profiles
      SET avatar_url = COALESCE(v_avatar_url, avatar_url)
      WHERE user_id = NEW.id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- 2. Garantir que o trigger está activo (pode já existir da migration anterior)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Backfill: gerar referral_code para utilizadores que ficaram sem um
DO $$
DECLARE
  r RECORD;
  v_code text;
BEGIN
  FOR r IN SELECT user_id FROM public.profiles WHERE referral_code IS NULL LOOP
    LOOP
      v_code := UPPER(SUBSTRING(md5(random()::text || r.user_id::text), 1, 8));
      EXIT WHEN NOT EXISTS (
        SELECT 1 FROM public.profiles WHERE referral_code = v_code
      );
    END LOOP;
    UPDATE public.profiles SET referral_code = v_code WHERE user_id = r.user_id;
  END LOOP;
END $$;

SELECT 'referral_code auto-gerado para novos utilizadores ✓' AS resultado;
