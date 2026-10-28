-- Fase A (aditiva — aplicar ANTES do deploy do frontend; não quebra a versão atual).
-- Criar e entrar numa casa passam a ser funções do servidor, para que a fase B
-- possa fechar a leitura de todas as casas e a inserção livre em members.

-- Máximo de 2 membros por casa. A regra existia em migrações antigas mas não
-- está em produção: hoje um terceiro utilizador consegue entrar numa casa.
CREATE OR REPLACE FUNCTION public.enforce_couple_space_max_members()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM 1 FROM public.couple_spaces WHERE id = NEW.couple_space_id FOR UPDATE;
  IF (SELECT count(*) FROM public.members WHERE couple_space_id = NEW.couple_space_id) >= 2 THEN
    RAISE EXCEPTION 'couple_space_full' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_couple_space_max_members ON public.members;
CREATE TRIGGER enforce_couple_space_max_members
  BEFORE INSERT ON public.members
  FOR EACH ROW EXECUTE FUNCTION public.enforce_couple_space_max_members();

-- Cria a casa do utilizador (ou devolve a que já tem) e torna-o membro.
CREATE OR REPLACE FUNCTION public.create_couple_space()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_space uuid;
  v_code text;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '28000';
  END IF;

  SELECT couple_space_id INTO v_space FROM public.members WHERE user_id = v_user;
  IF v_space IS NOT NULL THEN
    RETURN v_space;
  END IF;

  LOOP
    v_code := upper(substr(md5(gen_random_uuid()::text), 1, 8));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.couple_spaces WHERE invite_code = v_code);
  END LOOP;

  INSERT INTO public.couple_spaces (invite_code) VALUES (v_code) RETURNING id INTO v_space;
  INSERT INTO public.members (couple_space_id, user_id) VALUES (v_space, v_user);
  RETURN v_space;
END;
$$;

-- Entra na casa com o código de convite. Erros: invalid_code, couple_space_full,
-- already_member (P0001, para o cliente mapear a mensagem).
CREATE OR REPLACE FUNCTION public.join_couple_space(p_code text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_space uuid;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '28000';
  END IF;

  IF EXISTS (SELECT 1 FROM public.members WHERE user_id = v_user) THEN
    RAISE EXCEPTION 'already_member' USING ERRCODE = 'P0001';
  END IF;

  SELECT id INTO v_space FROM public.couple_spaces
  WHERE invite_code = upper(trim(p_code)) AND status = 'active';
  IF v_space IS NULL THEN
    RAISE EXCEPTION 'invalid_code' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.members (couple_space_id, user_id) VALUES (v_space, v_user);
  RETURN v_space;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_couple_space() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.join_couple_space(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.enforce_couple_space_max_members() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_couple_space() TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_couple_space(text) TO authenticated;
