-- Permitir que parceiros no mesmo "couple_space" possam visualizar as informações do ciclo se o share_level não for private
-- ou mesmo de forma permanente para simplificar, já que a APP é feita para casais.

-- 1. Partilha dos perfis
DROP POLICY IF EXISTS "Partner can view cycle_profiles" ON public.cycle_profiles;
CREATE POLICY "Partner can view cycle_profiles"
  ON public.cycle_profiles FOR SELECT
  USING (is_member_of_couple_space(couple_space_id));

-- 2. Partilha das menstruações
DROP POLICY IF EXISTS "Partner can view period_entries" ON public.period_entries;
CREATE POLICY "Partner can view period_entries"
  ON public.period_entries FOR SELECT
  USING (is_member_of_couple_space(couple_space_id));

-- 3. Partilha dos sintomas diários
DROP POLICY IF EXISTS "Partner can view daily_symptoms" ON public.daily_symptoms;
CREATE POLICY "Partner can view daily_symptoms"
  ON public.daily_symptoms FOR SELECT
  USING (is_member_of_couple_space(couple_space_id));

-- 4. Atualizar o default do share_level e garantir que casais antigos o têm ativado
ALTER TABLE public.cycle_profiles ALTER COLUMN share_level SET DEFAULT 'summary_signals';
UPDATE public.cycle_profiles SET share_level = 'summary_signals' WHERE share_level = 'private';
