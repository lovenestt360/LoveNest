-- ══════════════════════════════════════════════════════════════════
-- FIX 2026-05-01 — Admin RLS: payment_settings + subscription_plans
--
-- Problema: adminClient usa anon key (sem auth.uid()) e policies
-- mais antigas bloqueiam INSERT/UPDATE nessas tabelas.
--
-- Fix: Drop + recreate policies usando is_admin() (header x-admin-id)
--      para escritas e USING(true) para leituras públicas.
--      Seed dados por defeito se as tabelas estiverem vazias.
-- ══════════════════════════════════════════════════════════════════

-- ── 1. Garantir que is_admin() existe e está actualizada ──────────

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE id::text = current_setting('request.headers', true)::json->>'x-admin-id'
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ── 2. payment_settings — corrigir RLS ───────────────────────────

ALTER TABLE public.payment_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view payment settings"      ON public.payment_settings;
DROP POLICY IF EXISTS "Admins can update payment settings"    ON public.payment_settings;
DROP POLICY IF EXISTS "Admins can manage payment settings"    ON public.payment_settings;
DROP POLICY IF EXISTS "Anyone can read payment settings"      ON public.payment_settings;
DROP POLICY IF EXISTS "Admins full access payment settings"   ON public.payment_settings;

-- Qualquer pessoa pode ler (necessário para página de subscrição)
CREATE POLICY "Anyone can read payment settings"
    ON public.payment_settings FOR SELECT
    USING (true);

-- Apenas admins podem escrever
CREATE POLICY "Admins full access payment settings"
    ON public.payment_settings FOR ALL
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- ── 3. Seed payment_settings se vazio ────────────────────────────

INSERT INTO public.payment_settings (
    mpesa_number,
    emola_number,
    mkesh_number,
    account_name,
    whatsapp_number,
    whatsapp_message_template
)
SELECT
    '877815485',
    '877815485',
    '',
    'Dilson Quissico',
    '258877815485',
    'Olá, acabei de pagar o plano LoveNest.

Nome: {user_name}
Email: {user_email}
Casa: {house_name}
Plano: {plan_name}
Valor: {plan_price}

Segue o comprovativo para activação.'
WHERE NOT EXISTS (SELECT 1 FROM public.payment_settings);

-- ── 4. subscription_plans — corrigir RLS ─────────────────────────

ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view active subscription plans"  ON public.subscription_plans;
DROP POLICY IF EXISTS "Admins can manage subscription plans"       ON public.subscription_plans;
DROP POLICY IF EXISTS "Anyone can read active plans"               ON public.subscription_plans;
DROP POLICY IF EXISTS "Admins full access subscription plans"      ON public.subscription_plans;

-- Utilizadores lêem planos activos
CREATE POLICY "Anyone can read active plans"
    ON public.subscription_plans FOR SELECT
    USING (is_active = true OR public.is_admin());

-- Apenas admins escrevem
CREATE POLICY "Admins full access subscription plans"
    ON public.subscription_plans FOR ALL
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- ── 5. Seed subscription_plans se vazio ──────────────────────────

INSERT INTO public.subscription_plans (name, price, features, is_active)
SELECT name, price, features, true
FROM (VALUES
    ('LoveNest Mensal',     '500 MZN / Mês',        ARRAY['Acesso a todas as funcionalidades', 'Suporte prioritário', 'Actualizações incluídas']),
    ('LoveNest Semestral',  '2.500 MZN / Semestre',  ARRAY['Acesso a todas as funcionalidades', 'Suporte prioritário', 'Desconto especial de 17%']),
    ('LoveNest Lifetime',   '8.000 MZN / Único',     ARRAY['Acesso vitalício', 'Actualizações grátis para sempre', 'Suporte VIP'])
) AS v(name, price, features)
WHERE NOT EXISTS (SELECT 1 FROM public.subscription_plans);

NOTIFY pgrst, 'reload schema';

SELECT 'admin RLS payment_settings + subscription_plans corrigido ✓' AS resultado;
