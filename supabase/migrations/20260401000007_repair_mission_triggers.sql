-- ============================================================
-- REPARAÇÃO DE GATILHOS DE MISSÕES (REPAIR)
-- Garante que cada ação (Mensagem ou Hábito) dispara a verificação.
-- ============================================================

-- 1. GARANTIR QUE AS PONTUAÇÕES PADRÃO EXISTEM (RESET DE MISSÕES)
UPDATE public.love_missions SET mission_type = 'message_sent', target_count = 5 WHERE title = 'Tagarelas 💬';
UPDATE public.love_missions SET mission_type = 'task_completed', target_count = 5 WHERE title = 'Rotina Completa ✅';

-- 2. REPARAR O GATILHO (TRIGGER) NA TABELA DAILY_ACTIVITY
CREATE OR REPLACE FUNCTION public.tr_on_interaction_for_missions()
RETURNS TRIGGER AS $$
DECLARE
    v_couple_id UUID;
BEGIN
    -- Identifica o ID do casal
    IF TG_TABLE_NAME = 'daily_activity' THEN
        v_couple_id := NEW.couple_id;
    ELSE
        v_couple_id := NEW.couple_space_id;
    END IF;

    -- Garante que as missões de hoje estão geradas
    PERFORM public.fn_get_or_create_daily_missions_v5(v_couple_id);
    
    -- Tenta completar a missão para este tipo de ação (NEW.type)
    PERFORM public.checkMissionCompletion(v_couple_id, NEW.user_id, NEW.type);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. RE-LIGAR O GATILHO À TABELA DE ATIVIDADE
DROP TRIGGER IF EXISTS tr_daily_activity_mission_trigger ON public.daily_activity;
CREATE TRIGGER tr_daily_activity_mission_trigger
AFTER INSERT ON public.daily_activity
FOR EACH ROW EXECUTE FUNCTION public.tr_on_interaction_for_missions();

-- 4. ATRIBUIÇÃO DIRETA EM MENSAGENS (REDUNDÂNCIA DE SEGURANÇA)
-- Garante que mesmo sem 'daily_activity' explícita, a mensagem conta.
DROP TRIGGER IF EXISTS tr_on_message_mission ON public.messages;
CREATE TRIGGER tr_on_message_mission
AFTER INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.tr_on_interaction_for_missions();
