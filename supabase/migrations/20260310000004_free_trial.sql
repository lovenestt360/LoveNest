-- 20260310000004_free_trial.sql

-- 1. Add Trial Columns to Houses
ALTER TABLE public.houses 
    ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS trial_used BOOLEAN DEFAULT false;

-- 2. Cleanup Dummy Plans
-- Delete existing placeholder plans (This is safe if no active sub relies heavily on the plan name yet, otherwise we just deactivate them)
DELETE FROM public.subscription_plans 
WHERE name != 'LoveNest Premium';

-- Insert or Update default plan
INSERT INTO public.subscription_plans (id, name, price, features, billing_type, is_active)
VALUES (
    extensions.uuid_generate_v4(),
    'LoveNest Premium',
    '399 MZN',
    ARRAY['Gestão de Tarefas', 'Agenda e Oração', 'Memórias', 'Desafios Exclusivos', 'Cápsulas do Tempo'],
    'one_time',
    true
)
ON CONFLICT DO NOTHING;
