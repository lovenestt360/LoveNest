-- ══════════════════════════════════════════════════════════════════
-- MISSÕES — troca "Conversar" por "Plano" (universal)
-- ══════════════════════════════════════════════════════════════════
-- A missão de Conversar (chat) ficava inacessível a quem está em modo
-- solo, já que o Chat fica escondido e bloqueado nesse modo. Substituída
-- por uma missão de Agenda/Plano — disponível a qualquer pessoa,
-- independentemente de género, modo solo/casal ou religião.

UPDATE public.love_missions
SET title = 'Plano',
    description = 'Adiciona ou conclui algo na Agenda hoje',
    emoji = '📅',
    mission_type = 'plano',
    category = 'interaction'
WHERE mission_type = 'message';

NOTIFY pgrst, 'reload schema';

SELECT 'Missões: Conversar substituída por Plano ✓' AS resultado;
