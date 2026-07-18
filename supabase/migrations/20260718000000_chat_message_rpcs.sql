-- RPC functions para operações no chat que precisam de bypassar RLS
-- SECURITY DEFINER corre como owner (postgres), evita falhas silenciosas de RLS.
-- A verificação de autorização é feita dentro de cada função.

-- Apagar mensagem (soft delete) — só o remetente pode apagar a própria mensagem
CREATE OR REPLACE FUNCTION public.delete_chat_message(p_message_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE messages
  SET is_deleted = true,
      content    = '',
      image_url  = null,
      audio_url  = null,
      updated_at = now()
  WHERE id               = p_message_id
    AND sender_user_id   = auth.uid()
    AND is_deleted       = false;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'message_not_found_or_not_authorized';
  END IF;
END;
$$;

-- Editar mensagem — só o remetente pode editar a própria mensagem
CREATE OR REPLACE FUNCTION public.edit_chat_message(p_message_id uuid, p_content text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE messages
  SET content    = p_content,
      is_edited  = true,
      updated_at = now()
  WHERE id             = p_message_id
    AND sender_user_id = auth.uid()
    AND is_deleted     = false;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'message_not_found_or_not_authorized';
  END IF;
END;
$$;

-- Fixar/desafixar mensagem — qualquer membro do casal pode fixar
CREATE OR REPLACE FUNCTION public.pin_chat_message(p_message_id uuid, p_is_pinned boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_space_id uuid;
BEGIN
  SELECT couple_space_id INTO v_space_id
  FROM messages
  WHERE id = p_message_id;

  IF v_space_id IS NULL THEN
    RAISE EXCEPTION 'message_not_found';
  END IF;

  IF NOT is_member_of_couple_space(v_space_id) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  UPDATE messages
  SET is_pinned  = p_is_pinned,
      updated_at = now()
  WHERE id = p_message_id;
END;
$$;

-- Permissões para utilizadores autenticados
GRANT EXECUTE ON FUNCTION public.delete_chat_message(uuid)         TO authenticated;
GRANT EXECUTE ON FUNCTION public.edit_chat_message(uuid, text)     TO authenticated;
GRANT EXECUTE ON FUNCTION public.pin_chat_message(uuid, boolean)   TO authenticated;
