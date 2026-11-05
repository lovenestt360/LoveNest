-- Biblioteca passa a ser uma função como as outras: aparece em Funções (plano mínimo,
-- ligar/desligar, testar numa casa) e na lista "Inclui" dos planos.
-- Começa grátis para todos (min_tier 0), como estava até agora.
-- Idempotente: não mexe no plano se a linha já existir. Aplicar à mão no SQL Editor do Supabase.

INSERT INTO public.feature_tiers (feature_id, feature_label, min_tier)
VALUES ('biblioteca', 'Biblioteca', 0)
ON CONFLICT (feature_id) DO UPDATE SET feature_label = EXCLUDED.feature_label;
