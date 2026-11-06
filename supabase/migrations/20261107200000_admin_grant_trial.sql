-- Dar ou prolongar a experiência de uma casa, no painel admin.
-- Os dias somam ao que ainda falta. Casa com plano pago ativo não precisa de experiência.
-- Idempotente. Aplicar à mão no SQL Editor do Supabase.

BEGIN;

CREATE OR REPLACE FUNCTION public.admin_grant_trial(p_couple_space_id UUID, p_days INT)
RETURNS TIMESTAMPTZ
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_space RECORD;
  v_new_end TIMESTAMPTZ;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  IF p_days IS NULL OR p_days < 1 OR p_days > 366 THEN
    RAISE EXCEPTION 'invalid number of days';
  END IF;

  SELECT subscription_status, subscription_ends_at, trial_ends_at INTO v_space
  FROM public.couple_spaces WHERE id = p_couple_space_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'couple space not found';
  END IF;
  IF v_space.subscription_status = 'active'
     AND (v_space.subscription_ends_at IS NULL OR v_space.subscription_ends_at > now()) THEN
    RAISE EXCEPTION 'this couple already has an active paid plan';
  END IF;

  v_new_end := GREATEST(COALESCE(v_space.trial_ends_at, now()), now()) + make_interval(days => p_days);

  UPDATE public.couple_spaces
  SET trial_used = true,
      trial_started_at = CASE WHEN trial_ends_at > now() THEN trial_started_at ELSE now() END,
      trial_ends_at = v_new_end
  WHERE id = p_couple_space_id;

  RETURN v_new_end;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_grant_trial(UUID, INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_grant_trial(UUID, INT) TO authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;
