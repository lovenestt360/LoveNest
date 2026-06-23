-- ══════════════════════════════════════════════════════════════════
-- ONBOARDING V2 — Fase 1: novos campos de personalização em profiles
-- ══════════════════════════════════════════════════════════════════
-- País, religião/espiritualidade, modo de utilização (solo/casal) e
-- objetivo principal, recolhidos no novo fluxo de onboarding em /casa.
-- gender já existe (migration 20260225010000_add_gender.sql).

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS country_code text,
  ADD COLUMN IF NOT EXISTS language_preference text,
  ADD COLUMN IF NOT EXISTS religion text,
  ADD COLUMN IF NOT EXISTS usage_mode text,
  ADD COLUMN IF NOT EXISTS primary_goal text,
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS onboarding_completed_at timestamptz;

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_usage_mode_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_usage_mode_check
    CHECK (usage_mode IS NULL OR usage_mode IN ('solo','couple'));

-- Grandfather: utilizadores existentes nunca veem o novo fluxo de onboarding.
UPDATE public.profiles SET onboarding_completed = true, onboarding_completed_at = now()
WHERE onboarding_completed = false;

NOTIFY pgrst, 'reload schema';

SELECT 'Onboarding V2: campos de personalização em profiles ✓' AS resultado;
