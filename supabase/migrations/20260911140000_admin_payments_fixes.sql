-- ══════════════════════════════════════════════════════════════════════════
-- ADMIN PANEL + PAGAMENTOS — 2026-09-11 (parte 3)
-- Corrige achados de uma auditoria função-por-função ao painel admin feita
-- depois da migration de segurança de hoje, e prepara o sistema de
-- pagamentos (histórico, rejeição, feedback em tempo real).
-- ══════════════════════════════════════════════════════════════════════════


-- ────────────────────────────────────────────────────────────────────────
-- 1. handleApprovePayment ficou órfão da migration de segurança de hoje:
--    fazia UPDATE direto em couple_spaces.subscription_status/plan_id/
--    tier_level — exactamente as 3 colunas que ficaram fora do GRANT
--    UPDATE de authenticated. Falhava sempre: o pagamento marcava-se
--    "approved" mas a casa nunca era activada.
-- ────────────────────────────────────────────────────────────────────────

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS admin_notes TEXT;

-- Reutiliza a função de trigger já usada por book_purchases — não criar
-- uma nova.
DROP TRIGGER IF EXISTS set_updated_at ON public.payments;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

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
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  SELECT couple_space_id INTO v_couple_space_id
  FROM public.payments WHERE id = p_payment_id;

  IF v_couple_space_id IS NULL THEN
    RAISE EXCEPTION 'payment not found';
  END IF;

  UPDATE public.payments
  SET status = 'approved', updated_at = now()
  WHERE id = p_payment_id;

  UPDATE public.couple_spaces
  SET subscription_status = 'active',
      plan_id    = COALESCE(p_plan_id, plan_id),
      tier_level = COALESCE(p_tier_level, tier_level)
  WHERE id = v_couple_space_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_approve_payment(UUID, UUID, INT) TO authenticated;

-- Antes só havia "Aprovar" para pagamentos de subscrição — sem forma de
-- rejeitar (ao contrário de book_purchases, que já tem approve+reject).
CREATE OR REPLACE FUNCTION public.admin_reject_payment(p_payment_id UUID, p_notes TEXT DEFAULT NULL)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  UPDATE public.payments
  SET status = 'rejected', updated_at = now(), admin_notes = p_notes
  WHERE id = p_payment_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_reject_payment(UUID, TEXT) TO authenticated;

-- Paridade estrutural com payments — para book_purchases não ser um beco
-- sem saída se algum dia precisar de pagamento instantâneo/Stripe. Sem
-- mudança de comportamento agora, só as colunas com o valor por omissão.
ALTER TABLE public.book_purchases
  ADD COLUMN IF NOT EXISTS provider TEXT NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS external_id TEXT;

-- Necessário para o feedback em tempo real ao pagador (Realtime na tabela
-- payments, filtrado por couple_space_id).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'payments'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.payments;
  END IF;
END $$;


-- ────────────────────────────────────────────────────────────────────────
-- 2. pwa_tutorial_settings — a policy de UPDATE tinha USING a comparar a
--    coluna errada (admin_users.id em vez de user_id), por isso nunca
--    era verdadeira e o UPDATE afectava sempre 0 linhas — o toast dizia
--    sucesso mas nada era gravado. Também não existia policy de INSERT.
-- ────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Allow admins to update pwa settings" ON public.pwa_tutorial_settings;
CREATE POLICY "Allow admins to update pwa settings"
  ON public.pwa_tutorial_settings FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Allow admins to insert pwa settings" ON public.pwa_tutorial_settings;
CREATE POLICY "Allow admins to insert pwa settings"
  ON public.pwa_tutorial_settings FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());


-- ────────────────────────────────────────────────────────────────────────
-- 3. upsert_feature_flag não verificava is_admin() no próprio corpo e
--    estava GRANT a "anon" — qualquer visitante (mesmo sem sessão) podia
--    alterar feature flags da app inteira via supabase.rpc() directo.
-- ────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.upsert_feature_flag(
  p_key      TEXT,
  p_scope    TEXT,
  p_enabled  BOOLEAN,
  p_target_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  IF p_target_id IS NULL THEN
    INSERT INTO public.feature_flags (key, scope, enabled, target_id)
    VALUES (p_key, p_scope, p_enabled, NULL)
    ON CONFLICT (key, scope) WHERE target_id IS NULL
    DO UPDATE SET enabled = EXCLUDED.enabled
    RETURNING id INTO v_id;
  ELSE
    INSERT INTO public.feature_flags (key, scope, enabled, target_id)
    VALUES (p_key, p_scope, p_enabled, p_target_id)
    ON CONFLICT (key, scope, target_id) WHERE target_id IS NOT NULL
    DO UPDATE SET enabled = EXCLUDED.enabled
    RETURNING id INTO v_id;
  END IF;

  RETURN jsonb_build_object('id', v_id, 'success', true);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.upsert_feature_flag(TEXT, TEXT, BOOLEAN, UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.upsert_feature_flag(TEXT, TEXT, BOOLEAN, UUID) TO authenticated;

NOTIFY pgrst, 'reload schema';

SELECT 'admin panel + pagamentos 2026-09-11 aplicado ✓' AS resultado;

-- ══════════════════════════════════════════════════════════════════════════
-- VERIFICAÇÃO (correr depois de aplicar):
--   SELECT * FROM pg_policies WHERE tablename = 'pwa_tutorial_settings';
--   -- confirmar que a policy de UPDATE usa is_admin(), não admin_users.id
-- ══════════════════════════════════════════════════════════════════════════
