-- ============================================================
-- FIX: RLS do ciclo menstrual para acesso do parceiro
-- 
-- RAIZ DO PROBLEMA:
--   A migração 20260309... sobrescreveu todas as policies de 
--   cycle_profiles, period_entries e daily_symptoms com ONLY
--   "user_id = auth.uid()" — bloqueando o parceiro de ver qualquer dado.
--
-- SOLUÇÃO:
--   Adicionar policies SELECT para parceiros via are_users_in_same_couple_space()
--   E garantir que couple_space_id é preenchido nos registos existentes.
-- ============================================================

-- ── 1. Preencher couple_space_id NULL em cycle_profiles (registos antigos) ──
UPDATE public.cycle_profiles cp
SET couple_space_id = m.couple_space_id
FROM public.members m
WHERE m.user_id = cp.user_id
  AND cp.couple_space_id IS NULL;

-- ── 2. Preencher couple_space_id NULL em period_entries ──
UPDATE public.period_entries pe
SET couple_space_id = m.couple_space_id
FROM public.members m
WHERE m.user_id = pe.user_id
  AND pe.couple_space_id IS NULL;

-- ── 3. Preencher couple_space_id NULL em daily_symptoms ──
UPDATE public.daily_symptoms ds
SET couple_space_id = m.couple_space_id
FROM public.members m
WHERE m.user_id = ds.user_id
  AND ds.couple_space_id IS NULL;

-- ── 4. cycle_profiles: adicionar SELECT para parceiro ──
DROP POLICY IF EXISTS "Partner can view cycle_profiles"   ON public.cycle_profiles;
DROP POLICY IF EXISTS "Owner can view own cycle profile"  ON public.cycle_profiles;

-- Owner
CREATE POLICY "Owner can view own cycle profile"
ON public.cycle_profiles FOR SELECT
USING (user_id = auth.uid());

-- Parceiro via couple_space_id
CREATE POLICY "Partner can view cycle_profiles"
ON public.cycle_profiles FOR SELECT
USING (
  (couple_space_id IS NOT NULL AND public.is_member_of_couple_space(couple_space_id))
  OR
  -- Fallback: partner encontrado via JOIN directo em members
  EXISTS (
    SELECT 1
    FROM public.members m1
    JOIN public.members m2 ON m1.couple_space_id = m2.couple_space_id
    WHERE m1.user_id = auth.uid()
      AND m2.user_id = cycle_profiles.user_id
  )
);

-- ── 5. period_entries: adicionar SELECT para parceiro ──
DROP POLICY IF EXISTS "Partner can view period_entries"   ON public.period_entries;
DROP POLICY IF EXISTS "Owner can view own period entries" ON public.period_entries;

-- Owner
CREATE POLICY "Owner can view own period entries"
ON public.period_entries FOR SELECT
USING (user_id = auth.uid());

-- Parceiro
CREATE POLICY "Partner can view period_entries"
ON public.period_entries FOR SELECT
USING (
  (couple_space_id IS NOT NULL AND public.is_member_of_couple_space(couple_space_id))
  OR
  EXISTS (
    SELECT 1
    FROM public.members m1
    JOIN public.members m2 ON m1.couple_space_id = m2.couple_space_id
    WHERE m1.user_id = auth.uid()
      AND m2.user_id = period_entries.user_id
  )
);

-- ── 6. daily_symptoms: adicionar SELECT para parceiro apenas se share_level != 'private' ──
DROP POLICY IF EXISTS "Partner can view daily_symptoms"    ON public.daily_symptoms;
DROP POLICY IF EXISTS "Owner can view own daily symptoms"  ON public.daily_symptoms;

-- Owner
CREATE POLICY "Owner can view own daily symptoms"
ON public.daily_symptoms FOR SELECT
USING (user_id = auth.uid());

-- Parceiro (só se share_level for summary_signals — privacidade respeitada)
CREATE POLICY "Partner can view daily_symptoms"
ON public.daily_symptoms FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.members m1
    JOIN public.members m2 ON m1.couple_space_id = m2.couple_space_id
    JOIN public.cycle_profiles cp ON cp.user_id = m2.user_id
    WHERE m1.user_id = auth.uid()
      AND m2.user_id = daily_symptoms.user_id
      AND cp.share_level = 'summary_signals'   -- respeita a privacidade da owner
  )
);

-- ── 7. Garantir que share_level default é summary_signals ──
ALTER TABLE public.cycle_profiles
  ALTER COLUMN share_level SET DEFAULT 'summary_signals';

-- Actualizar registos antigos com private → summary (optional, comentar se necessário)
-- UPDATE public.cycle_profiles SET share_level = 'summary_signals' WHERE share_level = 'private';

-- ── 8. Recarregar schema ──
NOTIFY pgrst, 'reload schema';
