-- ══════════════════════════════════════════════════════════════════════
-- FIX 2026-05-12 #3: Referral server-side + unicidade + localStorage
--
-- Problemas:
--   A) handle_new_user ignorava referred_by_code da metadata
--      → email signups nunca gravavam o referral no DB
--   B) Tabela referrals sem unique constraint em new_user_id
--      → duplicados possíveis (hook frontend + trigger a correr juntos)
--   C) Race condition: hook frontend dependia de localStorage/sessionStorage
--      que poderia ter desaparecido após verificação de email
--
-- Fixes:
--   1. UNIQUE(new_user_id) na tabela referrals
--   2. handle_new_user processa referred_by_code da metadata → insert na
--      tabela referrals server-side, eliminando a dependência do frontend
-- ══════════════════════════════════════════════════════════════════════


-- ── 1. Unique constraint em referrals.new_user_id ─────────────────────

ALTER TABLE public.referrals
  DROP CONSTRAINT IF EXISTS referrals_new_user_id_unique;

ALTER TABLE public.referrals
  ADD CONSTRAINT referrals_new_user_id_unique UNIQUE (new_user_id);


-- ── 2. handle_new_user — processa referred_by_code da metadata ─────────

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_existing_user_id uuid;
  v_display_name     text;
  v_avatar_url       text;
  v_referral_code    text;
  v_ref_code_used    text;
  v_referrer_id      uuid;
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

  -- Processar código de convite da metadata (email signup e OAuth)
  v_ref_code_used := UPPER(COALESCE(NEW.raw_user_meta_data->>'referred_by_code', ''));
  IF v_ref_code_used != '' THEN
    SELECT user_id INTO v_referrer_id
    FROM public.profiles
    WHERE referral_code = v_ref_code_used
    LIMIT 1;

    -- Registar referral (sem self-referral, sem duplicado)
    IF v_referrer_id IS NOT NULL AND v_referrer_id != NEW.id THEN
      INSERT INTO public.referrals (referrer_user_id, new_user_id, reward_given)
      VALUES (v_referrer_id, NEW.id, false)
      ON CONFLICT (new_user_id) DO NOTHING;
    END IF;
  END IF;

  -- Só para OAuth (Google, etc.): transferir membership de conta duplicada
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

-- Garantir trigger activo
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


NOTIFY pgrst, 'reload schema';

SELECT
  'referral server-side ✓' AS resultado,
  '1: UNIQUE(new_user_id) | 2: handle_new_user processa referred_by_code da metadata' AS fixes;
