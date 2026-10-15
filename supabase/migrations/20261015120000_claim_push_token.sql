-- Um token FCM identifica o telemóvel, não a pessoa, e é único na tabela.
-- Quando outra conta entra no mesmo telemóvel, o token já existe em nome da
-- conta anterior: o upsert do cliente cai no ON CONFLICT DO UPDATE sobre uma
-- linha que não é do utilizador atual e a RLS recusa-o
-- ("new row violates row-level security policy (USING expression)").
--
-- Esta função passa o token para quem está autenticado agora: apaga a linha de
-- outra conta com o mesmo token e guarda-o para o utilizador atual.

CREATE OR REPLACE FUNCTION public.claim_push_token(
  p_fcm_token       text,
  p_couple_space_id uuid,
  p_user_agent      text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501';
  END IF;

  IF p_fcm_token IS NULL OR length(p_fcm_token) < 20 THEN
    RAISE EXCEPTION 'invalid token' USING ERRCODE = '22023';
  END IF;

  IF NOT public.is_member_of_couple_space(p_couple_space_id) THEN
    RAISE EXCEPTION 'not a member of this space' USING ERRCODE = '42501';
  END IF;

  -- O telemóvel deixa de receber as notificações da conta anterior.
  DELETE FROM public.push_subscriptions
  WHERE fcm_token = p_fcm_token
    AND user_id <> v_uid;

  INSERT INTO public.push_subscriptions (couple_space_id, user_id, fcm_token, user_agent)
  VALUES (p_couple_space_id, v_uid, p_fcm_token, p_user_agent)
  ON CONFLICT (fcm_token) WHERE fcm_token IS NOT NULL
  DO UPDATE SET
    couple_space_id = EXCLUDED.couple_space_id,
    user_agent      = EXCLUDED.user_agent;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_push_token(text, uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.claim_push_token(text, uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.claim_push_token(text, uuid, text) TO authenticated;
