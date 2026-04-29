-- Fix: when a Google OAuth user signs up with an email that already belongs
-- to an existing member, transfer the membership to the new auth UUID.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing_user_id uuid;
  v_display_name text;
  v_avatar_url text;
BEGIN
  -- Resolve display name and avatar from OAuth metadata or fallback to email prefix
  v_display_name := COALESCE(
    NEW.raw_user_meta_data->>'display_name',
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    split_part(NEW.email, '@', 1)
  );
  v_avatar_url := NEW.raw_user_meta_data->>'avatar_url';

  -- Upsert profile
  INSERT INTO public.profiles (user_id, display_name, avatar_url)
  VALUES (NEW.id, v_display_name, v_avatar_url)
  ON CONFLICT (user_id) DO UPDATE
    SET display_name = COALESCE(EXCLUDED.display_name, profiles.display_name),
        avatar_url   = COALESCE(EXCLUDED.avatar_url, profiles.avatar_url);

  -- If OAuth provider: check if same email already has a member record under a different UUID
  IF COALESCE(NEW.raw_app_meta_data->>'provider', 'email') != 'email' THEN
    SELECT au.id INTO v_existing_user_id
    FROM auth.users au
    JOIN public.members m ON m.user_id = au.id
    WHERE au.email = NEW.email
      AND au.id != NEW.id
    LIMIT 1;

    IF v_existing_user_id IS NOT NULL THEN
      -- Transfer all member records from old UUID to new UUID
      UPDATE public.members
      SET user_id = NEW.id
      WHERE user_id = v_existing_user_id;

      -- Copy display name / avatar if not already set
      UPDATE public.profiles
      SET display_name = COALESCE(v_display_name, (SELECT display_name FROM public.profiles WHERE user_id = v_existing_user_id)),
          avatar_url   = COALESCE(v_avatar_url,   (SELECT avatar_url   FROM public.profiles WHERE user_id = v_existing_user_id))
      WHERE user_id = NEW.id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Re-create trigger (idempotent)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

SELECT 'Google OAuth member link fix applied ✓' AS resultado;
