-- ============================================================
-- LIMPEZA NUCLEAR DE GATILHOS REDUNDANTES (V12.7)
-- Objetivo: Garantir que apenas a daily_activity controla streaks.
-- Bloquear disparos duplicados vindo da tabela messages.
-- ============================================================

-- 1. REMOVER GATILHO REDUNDANTE NA TABELA MESSAGES
-- Este gatilho era uma redundância de segurança que agora causa duplicação
-- já que o frontend insere manualmente na daily_activity.
DROP TRIGGER IF EXISTS tr_on_message_mission ON public.messages;

-- 2. GARANTIR QUE APENAS UM GATILHO EXISTE NA DAILY_ACTIVITY
DROP TRIGGER IF EXISTS tr_daily_activity_mission_trigger ON public.daily_activity;
DROP TRIGGER IF EXISTS tr_update_streak_on_activity ON public.daily_activity;

-- 3. RECONECTAR APENAS O GATILHO MESTRE (V5)
-- Este gatilho unifica missões e streaks num único processamento pós-inserção.
DROP TRIGGER IF EXISTS tr_daily_activity_master_v5 ON public.daily_activity;
CREATE TRIGGER tr_daily_activity_master_v5
AFTER INSERT ON public.daily_activity
FOR EACH ROW EXECUTE FUNCTION public.tr_on_interaction_for_missions();

-- 4. VERIFICAÇÃO DE INTEGRIDADE
-- A função tr_on_interaction_for_missions() já foi corrigida em 20260401000007.
