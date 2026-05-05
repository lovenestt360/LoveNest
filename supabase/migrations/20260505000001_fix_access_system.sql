-- ══════════════════════════════════════════════════════════════════
-- FIX ACCESS SYSTEM — 2026-05-05
--
-- Corrige todos os problemas do sistema de acesso por tier:
--
-- 1. Adiciona features em falta à tabela feature_tiers
-- 2. Corrige tier_level nas casas com subscrição activa
-- 3. Garante que free_mode está desligado
-- ══════════════════════════════════════════════════════════════════

-- ── 1. Inserir features em falta no feature_tiers ─────────────────
INSERT INTO public.feature_tiers (feature_id, feature_label, min_tier) VALUES
    ('wrapped',     'LoveWrapped',  1),
    ('lovestreak',  'LoveStreak',   1),
    ('ranking',     'Ranking',      1),
    ('descobrir',   'Descobrir',    1),
    ('wallpapers',  'Wallpapers',   1),
    ('stats',       'Estatísticas', 1)
ON CONFLICT (feature_id) DO NOTHING;

-- Garantir que as features base também existem
INSERT INTO public.feature_tiers (feature_id, feature_label, min_tier) VALUES
    ('mood',          'Humor',          1),
    ('prayer',        'Oração',         1),
    ('conflicts',     'Conflitos',      1),
    ('memories',      'Memórias',       1),
    ('cycle',         'Ciclo',          1),
    ('fasting',       'Jejum',          1),
    ('agenda',        'Agenda',         1),
    ('challenges',    'Desafios',       1),
    ('time_capsules', 'Cápsulas',       1)
ON CONFLICT (feature_id) DO NOTHING;

-- ── 2. Corrigir tier_level nas casas com subscrição activa ────────
-- Copiar tier_level do plano para a casa (para planos correctamente ligados)
UPDATE public.couple_spaces cs
SET tier_level = sp.tier_level
FROM public.subscription_plans sp
WHERE cs.plan_id = sp.id::text
  AND cs.subscription_status = 'active'
  AND sp.tier_level IS NOT NULL;

-- Casas com subscription_status='active' mas sem plan_id ou tier_level=0
-- → atribuir tier 1 (Plus) como mínimo, para não bloquear quem pagou
UPDATE public.couple_spaces
SET tier_level = 1
WHERE subscription_status = 'active'
  AND (tier_level IS NULL OR tier_level = 0);

-- ── 3. Garantir que free_mode está desligado ──────────────────────
-- (só actua se a chave existir — não cria se não existir)
UPDATE public.app_settings
SET value = 'false', updated_at = NOW()
WHERE key = 'free_mode'
  AND value = 'true';

-- ── 4. Casas com trial expirado e sem plano → tier 0 (sem acesso) ─
-- Isto já é o comportamento padrão (DEFAULT 0), mas garantimos limpeza
UPDATE public.couple_spaces
SET tier_level = 0
WHERE subscription_status NOT IN ('active')
  AND (trial_ends_at IS NULL OR trial_ends_at < NOW())
  AND tier_level > 0;

NOTIFY pgrst, 'reload schema';

SELECT
    'feature_tiers count' AS info,
    COUNT(*) AS total
FROM public.feature_tiers

UNION ALL

SELECT
    'active houses with tier > 0',
    COUNT(*)
FROM public.couple_spaces
WHERE subscription_status = 'active' AND tier_level > 0

UNION ALL

SELECT
    'free_mode status',
    CASE WHEN value = 'true' THEN 1 ELSE 0 END
FROM public.app_settings
WHERE key = 'free_mode'
LIMIT 1;
