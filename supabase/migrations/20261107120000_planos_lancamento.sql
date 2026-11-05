-- Planos de lançamento: Grátis + Plus (sem Pro por agora).
--  * Grátis (hábito diário): Humor, Jornada/chama, Desafios, Agenda, Biblioteca (sempre grátis). O Chat é sempre grátis.
--  * Plus (memórias e extras): Nossa História, Memórias, Cápsulas, LoveWrapped, Ciclo,
--    Conflitos, Oração e Jejum, Localização, Wallpapers.
--  * Preços do Plus: Mensal 100 MT · Semestral 500 MT · Anual 900 MT.
-- Quem já pagou mantém a data de fim que tem; o preço novo só vale para pagamentos novos.
-- Não mexe no Modo gratuito. Idempotente. Aplicar à mão no SQL Editor do Supabase.

BEGIN;

-- 1. Quem tem acesso a cada função
UPDATE public.feature_tiers SET min_tier = 0, updated_at = now()
WHERE feature_id IN ('mood', 'lovestreak', 'challenges', 'agenda', 'biblioteca');

UPDATE public.feature_tiers SET min_tier = 1, updated_at = now()
WHERE feature_id IN ('historia', 'memories', 'time_capsules', 'wrapped', 'cycle',
                     'conflicts', 'prayer', 'location_sharing', 'wallpapers');

-- 2. Planos Plus. O mensal existente (LovePlus) passa a 100 MT; os outros são criados se não existirem.
UPDATE public.subscription_plans
SET price = '100 MZN', price_mzn = NULL, tier_level = 1, is_active = true
WHERE billing_type = 'monthly' AND tier_level = 1 AND name = 'LovePlus';

INSERT INTO public.subscription_plans (name, price, billing_type, tier_level, is_active)
SELECT 'LovePlus', '100 MZN', 'monthly', 1, true
WHERE NOT EXISTS (SELECT 1 FROM public.subscription_plans WHERE tier_level = 1 AND billing_type = 'monthly');

INSERT INTO public.subscription_plans (name, price, billing_type, tier_level, is_active)
SELECT 'LovePlus Semestral', '500 MZN', 'semiannual', 1, true
WHERE NOT EXISTS (SELECT 1 FROM public.subscription_plans WHERE tier_level = 1 AND billing_type = 'semiannual');

INSERT INTO public.subscription_plans (name, price, billing_type, tier_level, is_active)
SELECT 'LovePlus Anual', '900 MZN', 'annual', 1, true
WHERE NOT EXISTS (SELECT 1 FROM public.subscription_plans WHERE tier_level = 1 AND billing_type = 'annual');

UPDATE public.subscription_plans SET price = '500 MZN', is_active = true
WHERE tier_level = 1 AND billing_type = 'semiannual';
UPDATE public.subscription_plans SET price = '900 MZN', is_active = true
WHERE tier_level = 1 AND billing_type = 'annual';

-- 3. A lista "Inclui" de cada plano Plus, a partir das funções do Plus
UPDATE public.subscription_plans p
SET features = COALESCE((
  SELECT array_agg(ft.feature_label ORDER BY ft.feature_label)
  FROM public.feature_tiers ft
  WHERE ft.min_tier BETWEEN 1 AND p.tier_level
), '{}')
WHERE p.tier_level = 1;

COMMIT;

-- Conferir:
-- SELECT name, billing_type, price, is_active, features FROM public.subscription_plans ORDER BY tier_level, billing_type;
-- SELECT feature_label, min_tier FROM public.feature_tiers ORDER BY min_tier, feature_label;
