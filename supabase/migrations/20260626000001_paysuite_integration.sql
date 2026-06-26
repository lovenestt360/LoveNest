-- ══════════════════════════════════════════════════════════════════════
-- Integração PaySuite — colunas de suporte
--
-- Prepara o fluxo de pagamentos automáticos (M-Pesa/e-Mola/cartão via
-- PaySuite) sem tocar no fluxo manual existente (comprovativo + aprovação
-- de admin), que continua a funcionar exatamente como hoje.
-- ══════════════════════════════════════════════════════════════════════

-- payments: distinguir origem do pagamento e guardar o ID da PaySuite
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS provider TEXT NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS external_id TEXT;

-- subscription_plans: preço numérico limpo em MZN, só para a API da
-- PaySuite — o campo "price" (texto livre, ex: "5000 MZN / Ano") continua
-- a ser o que se mostra ao utilizador. Enquanto price_mzn for NULL, esse
-- plano não mostra o botão de pagamento automático.
ALTER TABLE public.subscription_plans
  ADD COLUMN IF NOT EXISTS price_mzn NUMERIC;

NOTIFY pgrst, 'reload schema';

SELECT 'Integração PaySuite: colunas adicionadas ✓' AS resultado;
