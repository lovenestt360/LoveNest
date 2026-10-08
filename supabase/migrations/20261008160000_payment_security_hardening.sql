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

ALTER TABLE public.couple_spaces
  ADD COLUMN IF NOT EXISTS subscription_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS subscription_ends_at TIMESTAMPTZ;

-- Legacy plans were created when billing_type defaulted to "one_time".
-- Normalize them once so paid access always has an explicit duration.
UPDATE public.subscription_plans
SET billing_type = CASE
  WHEN lower(name) LIKE '%lifetime%' OR lower(name) LIKE '%vital%' THEN 'lifetime'
  WHEN lower(name) LIKE '%semestr%' THEN 'semiannual'
  WHEN lower(name) LIKE '%anual%' OR lower(name) LIKE '%annual%' THEN 'annual'
  ELSE 'monthly'
END
WHERE billing_type IS NULL OR billing_type = 'one_time';

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

-- ── Paid subscription lifecycle ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.activate_paid_subscription(
  p_couple_space_id UUID,
  p_plan_id UUID,
  p_effective_at TIMESTAMPTZ DEFAULT now()
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $
DECLARE
  v_plan RECORD;
  v_existing_end TIMESTAMPTZ;
  v_base TIMESTAMPTZ;
  v_new_end TIMESTAMPTZ;
BEGIN
  SELECT id, tier_level, billing_type
  INTO v_plan
  FROM public.subscription_plans
  WHERE id = p_plan_id
    AND is_active = true
  LIMIT 1;

  IF v_plan.id IS NULL THEN
    RAISE EXCEPTION 'active subscription plan not found';
  END IF;

  SELECT subscription_ends_at
  INTO v_existing_end
  FROM public.couple_spaces
  WHERE id = p_couple_space_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'couple space not found';
  END IF;

  -- A renewal never destroys unused paid time. Lifetime has no end date.
  v_base := CASE
    WHEN v_existing_end IS NOT NULL AND v_existing_end > p_effective_at
      THEN v_existing_end
    ELSE p_effective_at
  END;

  v_new_end := CASE v_plan.billing_type
    WHEN 'monthly'    THEN v_base + INTERVAL '1 month'
    WHEN 'semiannual' THEN v_base + INTERVAL '6 months'
    WHEN 'annual'     THEN v_base + INTERVAL '1 year'
    WHEN 'lifetime'   THEN NULL
    ELSE NULL
  END;

  IF v_plan.billing_type NOT IN ('monthly', 'semiannual', 'annual', 'lifetime') THEN
    RAISE EXCEPTION 'unsupported billing type: %', v_plan.billing_type;
  END IF;

  UPDATE public.couple_spaces
  SET subscription_status     = 'active',
      plan_id                 = v_plan.id,
      tier_level              = COALESCE(v_plan.tier_level, 0),
      subscription_started_at = COALESCE(subscription_started_at, p_effective_at),
      subscription_ends_at    = v_new_end
  WHERE id = p_couple_space_id;
END;
$;

REVOKE ALL ON FUNCTION public.activate_paid_subscription(UUID, UUID, TIMESTAMPTZ)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.activate_paid_subscription(UUID, UUID, TIMESTAMPTZ)
  TO service_role;

CREATE OR REPLACE FUNCTION public.expire_due_subscriptions()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE public.couple_spaces
  SET subscription_status = 'inactive',
      tier_level = 0
  WHERE subscription_status = 'active'
    AND subscription_ends_at IS NOT NULL
    AND subscription_ends_at <= now();

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$;

REVOKE ALL ON FUNCTION public.expire_due_subscriptions() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.expire_due_subscriptions() TO service_role;

-- Give existing active non-lifetime customers one complete term from rollout
-- if historical activation dates are unavailable. This is intentionally
-- generous rather than expiring a legitimate customer immediately.
DO $
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT cs.id AS couple_space_id, cs.plan_id
    FROM public.couple_spaces cs
    WHERE cs.subscription_status = 'active'
      AND cs.plan_id IS NOT NULL
      AND cs.subscription_started_at IS NULL
  LOOP
    PERFORM public.activate_paid_subscription(r.couple_space_id, r.plan_id, now());
  END LOOP;
END $;

-- Keep status/tier in sync for older clients that only understand
-- subscription_status. pg_cron is already used elsewhere in LoveNest.
DO $
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'expire-subscriptions-hourly') THEN
      PERFORM cron.unschedule('expire-subscriptions-hourly');
    END IF;

    PERFORM cron.schedule(
      'expire-subscriptions-hourly',
      '5 * * * *',
      'SELECT public.expire_due_subscriptions();'
    );
  END IF;
END $;

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

DROP TRIGGER IF EXISTS normalize_client_payment_insert ON public.payments;
CREATE TRIGGER normalize_client_payment_insert
BEFORE INSERT ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.normalize_client_payment_insert();


-- ── Book purchase normalization ────────────────────────────────────────────
-- A paid book request is also browser-created. Members may request/re-submit,
-- but the database decides the price, requester, pending status and receipt.
CREATE OR REPLACE FUNCTION public.normalize_client_book_purchase()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage
AS $
DECLARE
  v_book RECORD;
  v_path TEXT;
BEGIN
  IF auth.uid() IS NULL OR public.is_admin() THEN
    RETURN NEW;
  END IF;

  IF NOT public.is_member_of_couple_space(NEW.couple_space_id) THEN
    RAISE EXCEPTION 'not a member of this couple space';
  END IF;

  SELECT id, is_free, price, currency, status
  INTO v_book
  FROM public.books
  WHERE id = NEW.book_id
  LIMIT 1;

  IF v_book.id IS NULL OR v_book.status <> 'published' THEN
    RAISE EXCEPTION 'book unavailable';
  END IF;

  IF v_book.is_free THEN
    RAISE EXCEPTION 'free books do not require a purchase';
  END IF;

  IF NEW.method IS NULL OR NEW.method NOT IN ('M-Pesa', 'e-Mola', 'mKesh') THEN
    RAISE EXCEPTION 'invalid manual payment method';
  END IF;

  IF NEW.proof_url IS NULL OR btrim(NEW.proof_url) = '' THEN
    RAISE EXCEPTION 'payment receipt is required';
  END IF;

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

  NEW.amount       := to_char(COALESCE(v_book.price, 0), 'FM9999999990.00') || ' ' || COALESCE(v_book.currency, 'MZN');
  NEW.status       := 'pending';
  NEW.requested_by := auth.uid();
  NEW.admin_notes  := NULL;
  NEW.proof_url    := v_path;
  NEW.provider     := 'manual';
  NEW.external_id  := NULL;

  RETURN NEW;
END;
$;

DROP TRIGGER IF EXISTS normalize_client_book_purchase ON public.book_purchases;
CREATE TRIGGER normalize_client_book_purchase
BEFORE INSERT OR UPDATE ON public.book_purchases
FOR EACH ROW EXECUTE FUNCTION public.normalize_client_book_purchase();

-- ── Paid book file entitlement ─────────────────────────────────────────────
-- A private bucket is not an entitlement boundary if every authenticated user
-- has SELECT on storage.objects. Tie each file to books.file_path and require
-- either a free published book or an approved purchase in the caller's space.
DROP POLICY IF EXISTS "Authenticated can read book files via signed url" ON storage.objects;
DROP POLICY IF EXISTS "Entitled users can read book files" ON storage.objects;

CREATE POLICY "Entitled users can read book files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'book-files'
  AND (
    public.is_admin()
    OR EXISTS (
      SELECT 1
      FROM public.books b
      WHERE b.file_path = storage.objects.name
        AND b.status = 'published'
        AND (
          b.is_free = true
          OR EXISTS (
            SELECT 1
            FROM public.book_purchases bp
            WHERE bp.book_id = b.id
              AND bp.status = 'approved'
              AND public.is_member_of_couple_space(bp.couple_space_id)
          )
        )
    )
  )
);

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

-- New frontend writes <auth.uid()>/... object paths. During rollout we still
-- accept root-level names from an older cached frontend; the bucket is private
-- and Storage records the uploader as owner, so this does not expose receipts.
CREATE POLICY "Receipt owners can upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'receipts'
  AND auth.role() = 'authenticated'
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
    v_final_plan_id := v_stored_plan_id;
  ELSE
    SELECT id
    INTO v_final_plan_id
    FROM public.subscription_plans
    WHERE lower(name) = lower(v_plan_name)
    ORDER BY created_at DESC
    LIMIT 1;
  END IF;

  IF v_final_plan_id IS NULL THEN
    RAISE EXCEPTION 'payment plan not found';
  END IF;

  PERFORM public.activate_paid_subscription(v_couple_space_id, v_final_plan_id, now());

  UPDATE public.payments
  SET status = 'approved', updated_at = now()
  WHERE id = p_payment_id
    AND status = 'pending';
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_approve_payment(UUID, UUID, INT) TO authenticated;


-- Admin plan assignment follows the same duration rules as paid activation.
CREATE OR REPLACE FUNCTION public.admin_assign_plan(
  p_couple_space_id UUID,
  p_plan_id UUID,
  p_tier_level INT,
  p_trial_days INT DEFAULT 0
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  PERFORM public.activate_paid_subscription(p_couple_space_id, p_plan_id, now());

  IF p_trial_days > 0 THEN
    UPDATE public.couple_spaces
    SET trial_started_at = now(),
        trial_ends_at = now() + make_interval(days => p_trial_days),
        trial_used = true
    WHERE id = p_couple_space_id;
  END IF;
END;
$;
GRANT EXECUTE ON FUNCTION public.admin_assign_plan(UUID, UUID, INT, INT) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_remove_plan(p_couple_space_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  UPDATE public.couple_spaces
  SET subscription_status = 'inactive',
      plan_id = NULL,
      tier_level = 0,
      subscription_started_at = NULL,
      subscription_ends_at = NULL
  WHERE id = p_couple_space_id;
END;
$;
GRANT EXECUTE ON FUNCTION public.admin_remove_plan(UUID) TO authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;
