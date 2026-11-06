-- Suspensão com motivo e remover experiência (painel admin).
--  * Motivo "subscription": sai sozinha quando um plano é ativado (pagamento confirmado).
--  * Motivo "irregular": pagar não a tira; só o admin a levanta. A nota é mostrada à casa.
--  * admin_remove_trial: termina já a experiência de uma casa.
-- Idempotente. Aplicar à mão no SQL Editor do Supabase.

BEGIN;

ALTER TABLE public.couple_spaces
  ADD COLUMN IF NOT EXISTS suspension_reason TEXT,
  ADD COLUMN IF NOT EXISTS suspension_note TEXT;

ALTER TABLE public.couple_spaces DROP CONSTRAINT IF EXISTS couple_spaces_suspension_reason_check;
ALTER TABLE public.couple_spaces
  ADD CONSTRAINT couple_spaces_suspension_reason_check
  CHECK (suspension_reason IS NULL OR suspension_reason IN ('subscription', 'irregular'));

-- As casas já suspensas não tinham motivo: contam como subscrição.
UPDATE public.couple_spaces
SET suspension_reason = 'subscription'
WHERE is_suspended = true AND suspension_reason IS NULL;

DROP FUNCTION IF EXISTS public.admin_set_suspended(UUID, BOOLEAN);

CREATE OR REPLACE FUNCTION public.admin_set_suspended(
  p_couple_space_id UUID,
  p_suspended BOOLEAN,
  p_reason TEXT DEFAULT 'subscription',
  p_note TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  UPDATE public.couple_spaces
  SET is_suspended = p_suspended,
      suspension_reason = CASE WHEN p_suspended THEN p_reason END,
      suspension_note = CASE WHEN p_suspended THEN NULLIF(btrim(p_note), '') END
  WHERE id = p_couple_space_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_suspended(UUID, BOOLEAN, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_suspended(UUID, BOOLEAN, TEXT, TEXT) TO authenticated;

-- Igual à versão anterior, mais: ativar um plano levanta a suspensão por subscrição.
CREATE OR REPLACE FUNCTION public.activate_paid_subscription(
  p_couple_space_id UUID,
  p_plan_id UUID,
  p_effective_at TIMESTAMPTZ DEFAULT now()
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
      plan_id                 = v_plan.id::text,  -- couple_spaces.plan_id é TEXT
      tier_level              = COALESCE(v_plan.tier_level, 0),
      subscription_started_at = COALESCE(subscription_started_at, p_effective_at),
      subscription_ends_at    = v_new_end,
      is_suspended            = CASE WHEN suspension_reason = 'subscription' THEN false ELSE is_suspended END,
      suspension_note         = CASE WHEN suspension_reason = 'subscription' THEN NULL ELSE suspension_note END,
      suspension_reason       = CASE WHEN suspension_reason = 'subscription' THEN NULL ELSE suspension_reason END
  WHERE id = p_couple_space_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_remove_trial(p_couple_space_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  UPDATE public.couple_spaces
  SET trial_used = true,
      trial_ends_at = now()
  WHERE id = p_couple_space_id
    AND trial_ends_at > now();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'this couple has no active trial';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_remove_trial(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_remove_trial(UUID) TO authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;
