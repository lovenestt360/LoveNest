-- ============================================================
-- MISSÕES V8 — ISOLAMENTO DE TIPOS DE AÇÃO
-- Garantir que cada interação apenas completa missões do mesmo tipo.
-- ============================================================

-- 1. Eliminar assinaturas antigas para evitar erro de "is not unique"
DROP FUNCTION IF EXISTS public.checkmissioncompletion(uuid, uuid);
DROP FUNCTION IF EXISTS public.checkmissioncompletion(uuid, uuid, text);

-- 2. Redefinir a função principal de verificação
CREATE OR REPLACE FUNCTION public.checkMissionCompletion(
    p_couple_space_id UUID, 
    p_user_id UUID, 
    p_action_type TEXT DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
    v_mission RECORD;
    v_current_count BIGINT;
BEGIN
    -- Procurar missões atribuídas hoje que correspondam ao tipo de ação (se fornecido)
    FOR v_mission IN
        SELECT lm.id, lm.mission_type, lm.target_count
        FROM public.couple_daily_missions cdm
        JOIN public.love_missions lm ON cdm.mission_id = lm.id
        WHERE cdm.couple_space_id = p_couple_space_id
          AND cdm.assignment_date = CURRENT_DATE
          AND (p_action_type IS NULL OR lm.mission_type = p_action_type)
    LOOP
        -- Contar atividades apenas do tipo específico
        SELECT COUNT(*) INTO v_current_count
        FROM public.daily_activity
        WHERE user_id = p_user_id
          AND couple_id = p_couple_space_id
          AND type = v_mission.mission_type
          AND created_at::DATE = CURRENT_DATE;

        -- Se atingir o objetivo, marcar como concluído
        IF v_current_count >= COALESCE(v_mission.target_count, 1) THEN
            IF NOT EXISTS (
                SELECT 1 FROM public.mission_completions
                WHERE user_id = p_user_id
                  AND mission_id = v_mission.id
                  AND completed_at::DATE = CURRENT_DATE
            ) THEN
                INSERT INTO public.mission_completions (user_id, mission_id, couple_space_id, completed_at)
                VALUES (p_user_id, v_mission.id, p_couple_space_id, CURRENT_DATE);
            END IF;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Atualizar a função do trigger para passar o tipo da interação
CREATE OR REPLACE FUNCTION public.tr_on_interaction_for_missions()
RETURNS TRIGGER AS $$
DECLARE
    v_couple_id UUID;
BEGIN
    -- Detetar qual a coluna de ID do casal (polimórfico)
    IF TG_TABLE_NAME = 'daily_activity' THEN
        v_couple_id := NEW.couple_id;
    ELSE
        v_couple_id := NEW.couple_space_id;
    END IF;

    -- Garantir que as missões existem
    PERFORM public.fn_get_or_create_daily_missions_v5(v_couple_id);
    
    -- Verificar conclusão apenas para o tipo específico inserido (NEW.type)
    PERFORM public.checkMissionCompletion(v_couple_id, NEW.user_id, NEW.type);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
