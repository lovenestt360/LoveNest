-- ══════════════════════════════════════════════════════════════════
-- TIER SYSTEM — 2026-05-04
--
-- Substitui o modelo "lista de features por plano" por um sistema
-- de níveis (tiers) profissional:
--
--   Tier 0 = Free   → sempre acessível (sem plano)
--   Tier 1 = Plus   → requer plano nível 1+
--   Tier 2 = Pro    → requer plano nível 2+
--   Tier 3 = Max    → requer plano nível 3
--
-- Cada feature tem um min_tier.
-- Cada plano tem um tier_level.
-- Acesso = user.tier_level >= feature.min_tier
-- ══════════════════════════════════════════════════════════════════

-- ── 1. Adicionar tier_level aos planos ───────────────────────────
ALTER TABLE public.subscription_plans
    ADD COLUMN IF NOT EXISTS tier_level INT NOT NULL DEFAULT 1;

-- ── 2. Adicionar tier_level às casas (desnormalizado para lookup rápido) ──
ALTER TABLE public.couple_spaces
    ADD COLUMN IF NOT EXISTS tier_level INT NOT NULL DEFAULT 0;

-- ── 3. Actualizar planos existentes ──────────────────────────────
UPDATE public.subscription_plans SET tier_level = 1 WHERE name ILIKE '%mensal%';
UPDATE public.subscription_plans SET tier_level = 2 WHERE name ILIKE '%semestral%';
UPDATE public.subscription_plans SET tier_level = 3
    WHERE name ILIKE '%vitalic%' OR name ILIKE '%lifetime%' OR name ILIKE '%anual%' OR name ILIKE '%max%';

-- ── 4. Criar tabela feature_tiers ────────────────────────────────
CREATE TABLE IF NOT EXISTS public.feature_tiers (
    feature_id    TEXT PRIMARY KEY,
    feature_label TEXT NOT NULL,
    min_tier      INT  NOT NULL DEFAULT 1,
    updated_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.feature_tiers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read feature tiers"  ON public.feature_tiers;
DROP POLICY IF EXISTS "Admins manage feature tiers"    ON public.feature_tiers;

CREATE POLICY "Anyone can read feature tiers"
    ON public.feature_tiers FOR SELECT USING (true);

CREATE POLICY "Admins manage feature tiers"
    ON public.feature_tiers FOR ALL
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- ── 5. Seed feature_tiers (padrão: tudo em tier 1 = Plus) ────────
INSERT INTO public.feature_tiers (feature_id, feature_label, min_tier) VALUES
    ('mood',          'Humor',          1),
    ('prayer',        'Oração',         1),
    ('conflicts',     'Conflitos',      1),
    ('memories',      'Memórias',       1),
    ('cycle',         'Ciclo',          1),
    ('fasting',       'Jejum',          1),
    ('agenda',        'Agenda',         1),
    ('wallpapers',    'Wallpapers',     1),
    ('stats',         'Estatísticas',   1),
    ('time_capsules', 'Cápsulas',       1),
    ('challenges',    'Desafios',       1)
ON CONFLICT (feature_id) DO NOTHING;

-- ── 6. Actualizar casas com subscrição activa ─────────────────────
-- Copiar o tier_level do plano para a casa
UPDATE public.couple_spaces cs
SET tier_level = sp.tier_level
FROM public.subscription_plans sp
WHERE cs.plan_id = sp.id
  AND cs.subscription_status = 'active';

NOTIFY pgrst, 'reload schema';

SELECT 'tier system migration complete ✓' AS resultado;
