-- Painel admin (parte 2): Renovar e Prolongar.
--  * Renovar: o casal pagou por fora (WhatsApp, dinheiro…). Fica um pagamento
--    "approved" no histórico e o plano soma a sua duração ao fim atual.
--  * Prolongar: oferta de dias, sem pagamento.
-- A regra que normaliza pagamentos criados no browser passa a deixar o admin.
-- Idempotente. Aplicar à mão no SQL Editor do Supabase.

BEGIN;

CREATE OR REPLACE FUNCTION public.normalize_client_payment_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage
AS $$
DECLARE
  v_plan RECORD;
  v_path TEXT;
BEGIN
  -- Service-role / server inserts have no auth.uid(); leave them untouched.
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  -- Admins registam pagamentos recebidos por fora (Renovar); não são pedidos do casal.
  IF public.is_admin() THEN
    RETURN NEW;
  END IF;

  IF NOT public.is_member_of_couple_space(NEW.couple_space_id) THEN
    RAISE EXCEPTION 'not a member of this couple space';
  END IF;

  IF NEW.plan_id IS NOT NULL THEN
    SELECT id, name, price, tier_level
    INTO v_plan
    FROM public.subscription_plans
    WHERE id = NEW.plan_id
      AND is_active = true
    LIMIT 1;
  ELSE
    SELECT id, name, price, tier_level
    INTO v_plan
    FROM public.subscription_plans
    WHERE lower(name) = lower(NEW.plan_name)
      AND is_active = true
    ORDER BY created_at DESC
    LIMIT 1;
  END IF;

  IF v_plan.id IS NULL THEN
    RAISE EXCEPTION 'invalid or inactive subscription plan';
  END IF;

  IF NEW.method IS NULL OR NEW.method NOT IN ('M-Pesa', 'e-Mola', 'mKesh') THEN
    RAISE EXCEPTION 'invalid manual payment method';
  END IF;

  IF NEW.proof_url IS NULL OR btrim(NEW.proof_url) = '' THEN
    RAISE EXCEPTION 'payment receipt is required';
  END IF;

  -- Legacy clients stored a full public URL. New clients store only the
  -- object path. Normalize both to the object path before persisting.
  v_path := btrim(NEW.proof_url);
  IF position('/storage/v1/object/public/receipts/' in v_path) > 0 THEN
    v_path := split_part(v_path, '/storage/v1/object/public/receipts/', 2);
  ELSIF position('/storage/v1/object/sign/receipts/' in v_path) > 0 THEN
    v_path := split_part(v_path, '/storage/v1/object/sign/receipts/', 2);
    v_path := split_part(v_path, '?', 1);
  ELSIF v_path ~* '^https?://' THEN
    RAISE EXCEPTION 'receipt must belong to LoveNest storage';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM storage.objects o
    WHERE o.bucket_id = 'receipts'
      AND o.name = v_path
      AND o.owner = auth.uid()
  ) THEN
    RAISE EXCEPTION 'receipt not found or not owned by current user';
  END IF;

  NEW.plan_id      := v_plan.id;
  NEW.plan_name    := v_plan.name;
  NEW.amount       := v_plan.price;
  NEW.status       := 'pending';
  NEW.provider     := 'manual';
  NEW.external_id  := NULL;
  NEW.admin_notes  := NULL;
  NEW.created_by   := auth.uid();
  NEW.proof_url    := v_path;

  RETURN NEW;
END;
$$;


CREATE OR REPLACE FUNCTION public.admin_renew_subscription(
  p_couple_space_id UUID,
  p_plan_id UUID,
  p_method TEXT DEFAULT 'M-Pesa'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan RECORD;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  SELECT id, name, price INTO v_plan
  FROM public.subscription_plans WHERE id = p_plan_id AND is_active = true LIMIT 1;
  IF v_plan.id IS NULL THEN
    RAISE EXCEPTION 'active subscription plan not found';
  END IF;

  INSERT INTO public.payments (couple_space_id, plan_id, plan_name, amount, method, status, provider, created_by, admin_notes)
  VALUES (p_couple_space_id, v_plan.id, v_plan.name, v_plan.price, COALESCE(NULLIF(btrim(p_method), ''), 'Outro'),
          'approved', 'admin', auth.uid(), 'Renovação registada no painel');

  PERFORM public.activate_paid_subscription(p_couple_space_id, v_plan.id, now());
END;
$$;

REVOKE ALL ON FUNCTION public.admin_renew_subscription(UUID, UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_renew_subscription(UUID, UUID, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_extend_subscription(
  p_couple_space_id UUID,
  p_days INT
)
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

  SELECT plan_id, subscription_status, subscription_ends_at INTO v_space
  FROM public.couple_spaces WHERE id = p_couple_space_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'couple space not found';
  END IF;
  IF v_space.plan_id IS NULL THEN
    RAISE EXCEPTION 'this couple has no plan to extend';
  END IF;
  IF v_space.subscription_status = 'active' AND v_space.subscription_ends_at IS NULL THEN
    RAISE EXCEPTION 'lifetime plans do not expire';
  END IF;

  v_new_end := GREATEST(COALESCE(v_space.subscription_ends_at, now()), now()) + make_interval(days => p_days);

  UPDATE public.couple_spaces
  SET subscription_status = 'active',
      subscription_ends_at = v_new_end
  WHERE id = p_couple_space_id;

  RETURN v_new_end;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_extend_subscription(UUID, INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_extend_subscription(UUID, INT) TO authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;
