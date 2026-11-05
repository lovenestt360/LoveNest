-- Pagamentos pela EPay: a função "epay" confirma o pagamento com a EPay e chama isto.
--  * Só o servidor (service_role) pode chamar.
--  * Seguro contra avisos repetidos: um pagamento já aprovado não soma tempo outra vez.
-- Idempotente. Aplicar à mão no SQL Editor do Supabase.

BEGIN;

CREATE UNIQUE INDEX IF NOT EXISTS payments_epay_external_id_key
  ON public.payments (external_id)
  WHERE provider = 'epay' AND external_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.epay_mark_paid(p_payment_id UUID, p_method TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row RECORD;
BEGIN
  SELECT id, couple_space_id, plan_id, status, provider
  INTO v_row
  FROM public.payments
  WHERE id = p_payment_id
  FOR UPDATE;

  IF NOT FOUND OR v_row.provider <> 'epay' THEN
    RAISE EXCEPTION 'epay payment not found';
  END IF;
  IF v_row.status = 'approved' THEN
    RETURN FALSE;
  END IF;
  IF v_row.plan_id IS NULL THEN
    RAISE EXCEPTION 'payment has no plan';
  END IF;

  PERFORM public.activate_paid_subscription(v_row.couple_space_id, v_row.plan_id, now());

  UPDATE public.payments
  SET status = 'approved',
      method = COALESCE(NULLIF(btrim(p_method), ''), method),
      admin_notes = NULL,
      updated_at = now()
  WHERE id = p_payment_id;

  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.epay_mark_paid(UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.epay_mark_paid(UUID, TEXT) TO service_role;

NOTIFY pgrst, 'reload schema';

COMMIT;
