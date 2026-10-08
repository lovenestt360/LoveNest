-- ═══════════════════════════════════════════════════════════════════════════
-- PAYMENT HARDENING — 2026-10-08
--
-- Goals:
-- 1) Manual payment amount/plan/status/provider become server-authoritative.
-- 2) PaySuite payments keep the immutable plan_id that was purchased.
-- 3) Receipt bucket becomes private; admins/owners use signed URLs.
-- 4) Existing clients remain compatible during rollout:
--      - legacy full public receipt URLs are accepted and normalized to a path;
--      - manual INSERT into payments still exists, but a BEFORE INSERT trigger
--        overwrites sensitive fields from trusted DB data.
--
-- Rollout:
--   a) deploy frontend from the matching PR first;
--   b) apply this migration;
--   c) deploy create-paysuite-payment + paysuite-webhook.
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS plan_id UUID REFERENCES public.subscription_plans(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Best-effort backfill for existing rows.
UPDATE public.payments p
SET plan_id = (
  SELECT sp.id
  FROM public.subscription_plans sp
  WHERE lower(sp.name) = lower(p.plan_name)
  ORDER BY sp.created_at DESC
  LIMIT 1
)
WHERE p.plan_id IS NULL;

-- ── Manual payment normalization ───────────────────────────────────────────
-- Any authenticated browser insert is treated as a manual request. The user
-- may choose a plan, but cannot choose its price, status, provider, external
-- id, admin notes, or another user's receipt.
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

  IF NEW.method NOT IN ('M-Pesa', 'e-Mola', 'mKesh') THEN
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

DROP TRIGGER IF EXISTS normalize_client_payment_insert ON public.payments;
CREATE TRIGGER normalize_client_payment_insert
BEFORE INSERT ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.normalize_client_payment_insert();

-- ── Receipt storage privacy ────────────────────────────────────────────────
UPDATE storage.buckets
SET public = false
WHERE id = 'receipts';

DROP POLICY IF EXISTS "Public can view receipts" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload receipts" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own receipts" ON storage.objects;
DROP POLICY IF EXISTS "Admins can manage receipts" ON storage.objects;
DROP POLICY IF EXISTS "Receipt owners can view" ON storage.objects;
DROP POLICY IF EXISTS "Receipt owners can upload" ON storage.objects;
DROP POLICY IF EXISTS "Receipt owners can update" ON storage.objects;
DROP POLICY IF EXISTS "Receipt owners can delete" ON storage.objects;
DROP POLICY IF EXISTS "Admins can manage private receipts" ON storage.objects;

CREATE POLICY "Receipt owners can view"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'receipts'
  AND (owner = auth.uid() OR public.is_admin())
);

-- New frontend writes <auth.uid()>/... object paths.
CREATE POLICY "Receipt owners can upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'receipts'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Receipt owners can update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'receipts'
  AND owner = auth.uid()
)
WITH CHECK (
  bucket_id = 'receipts'
  AND owner = auth.uid()
);

CREATE POLICY "Receipt owners can delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'receipts'
  AND owner = auth.uid()
);

CREATE POLICY "Admins can manage private receipts"
ON storage.objects FOR ALL
TO authenticated
USING (bucket_id = 'receipts' AND public.is_admin())
WITH CHECK (bucket_id = 'receipts' AND public.is_admin());

-- ── Admin approval: plan comes from the payment, not from browser params ──
CREATE OR REPLACE FUNCTION public.admin_approve_payment(
  p_payment_id UUID,
  p_plan_id    UUID DEFAULT NULL,
  p_tier_level INT  DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_couple_space_id UUID;
  v_stored_plan_id  UUID;
  v_plan_name       TEXT;
  v_final_plan_id   UUID;
  v_final_tier      INT;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  SELECT couple_space_id, plan_id, plan_name
  INTO v_couple_space_id, v_stored_plan_id, v_plan_name
  FROM public.payments
  WHERE id = p_payment_id
    AND status = 'pending';

  IF v_couple_space_id IS NULL THEN
    RAISE EXCEPTION 'pending payment not found';
  END IF;

  IF v_stored_plan_id IS NOT NULL THEN
    SELECT id, tier_level
    INTO v_final_plan_id, v_final_tier
    FROM public.subscription_plans
    WHERE id = v_stored_plan_id
    LIMIT 1;
  ELSE
    -- Legacy row fallback.
    SELECT id, tier_level
    INTO v_final_plan_id, v_final_tier
    FROM public.subscription_plans
    WHERE lower(name) = lower(v_plan_name)
    ORDER BY created_at DESC
    LIMIT 1;
  END IF;

  IF v_final_plan_id IS NULL THEN
    RAISE EXCEPTION 'payment plan not found';
  END IF;

  UPDATE public.couple_spaces
  SET subscription_status = 'active',
      plan_id              = v_final_plan_id,
      tier_level           = COALESCE(v_final_tier, 0)
  WHERE id = v_couple_space_id;

  UPDATE public.payments
  SET status = 'approved', updated_at = now()
  WHERE id = p_payment_id
    AND status = 'pending';
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_approve_payment(UUID, UUID, INT) TO authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;
