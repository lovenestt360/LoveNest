-- ══════════════════════════════════════════════════════════════════
-- MISSÕES — troca "Oração" por "Leitura" (universal)
-- ══════════════════════════════════════════════════════════════════
-- A missão de Oração ficava inacessível a quem está em modo solo ou
-- escolheu religion="none" (a Jornada Espiritual fica escondida para
-- esses utilizadores). Substituída por uma missão de leitura na
-- Biblioteca — disponível a qualquer pessoa, independentemente de
-- género, modo solo/casal ou religião. Atualiza a linha existente (em
-- vez de apagar e recriar) para preservar mission_completions já
-- registadas a apontar para este mission_id.

UPDATE public.love_missions
SET title = 'Leitura',
    description = 'Lê um pouco de um livro na Biblioteca hoje',
    emoji = '📖',
    mission_type = 'leitura',
    category = 'interaction'
WHERE mission_type = 'prayer';

NOTIFY pgrst, 'reload schema';

SELECT 'Missões: Oração substituída por Leitura ✓' AS resultado;
