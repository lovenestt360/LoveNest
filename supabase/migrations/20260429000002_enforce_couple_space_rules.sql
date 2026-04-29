-- ============================================================
-- 1. Enforce max 2 members per couple space (database level)
-- ============================================================
CREATE OR REPLACE FUNCTION public.check_couple_space_member_limit()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF (
    SELECT COUNT(*) FROM public.members
    WHERE couple_space_id = NEW.couple_space_id
  ) >= 2 THEN
    RAISE EXCEPTION 'Este espaço de casal já tem 2 membros. Limite atingido.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_couple_space_limit ON public.members;
CREATE TRIGGER enforce_couple_space_limit
  BEFORE INSERT ON public.members
  FOR EACH ROW EXECUTE FUNCTION public.check_couple_space_member_limit();

-- ============================================================
-- 2. Fix handle_new_user — Google OAuth só transfere membership
--    se existir conta com mesmo email JÁ dentro de um casal.
--    Nunca cria nem adiciona a casais alheios.
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_existing_user_id uuid;
  v_display_name     text;
  v_avatar_url       text;
BEGIN
  v_display_name := COALESCE(
    NEW.raw_user_meta_data->>'display_name',
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    split_part(NEW.email, '@', 1)
  );
  v_avatar_url := NEW.raw_user_meta_data->>'avatar_url';

  -- Criar/actualizar profile
  INSERT INTO public.profiles (user_id, display_name, avatar_url)
  VALUES (NEW.id, v_display_name, v_avatar_url)
  ON CONFLICT (user_id) DO UPDATE
    SET display_name = COALESCE(EXCLUDED.display_name, profiles.display_name),
        avatar_url   = COALESCE(EXCLUDED.avatar_url, profiles.avatar_url);

  -- Só para OAuth (Google, etc.): se existe outra conta com o mesmo email
  -- que JÁ está num casal, transferir a membership para o novo UUID.
  -- Nunca adicionar a casais de terceiros.
  IF COALESCE(NEW.raw_app_meta_data->>'provider', 'email') != 'email' THEN
    SELECT au.id INTO v_existing_user_id
    FROM auth.users au
    INNER JOIN public.members m ON m.user_id = au.id
    WHERE au.email = NEW.email
      AND au.id != NEW.id
    LIMIT 1;

    IF v_existing_user_id IS NOT NULL THEN
      -- Substituir o UUID antigo pelo novo — não adiciona linha nova
      UPDATE public.members
      SET user_id = NEW.id
      WHERE user_id = v_existing_user_id;

      -- Actualizar também outras tabelas que referenciam o UUID antigo
      UPDATE public.profiles
      SET avatar_url = COALESCE(v_avatar_url, avatar_url)
      WHERE user_id = NEW.id;
    END IF;
    -- Se não encontrou match → utilizador novo, vai fazer onboarding normalmente
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

SELECT 'Regras de casal aplicadas: max 2 membros + Google OAuth seguro ✓' AS resultado;
