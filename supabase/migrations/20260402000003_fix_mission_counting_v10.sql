-- ============================================================
-- CORREÇÃO DEFINITIVA DE CONTAGEM DE MISSÕES (V10)
-- Objetivo: Garantir contagem 1:1 baseada estritamente em daily_activity.
-- ============================================================

-- 1. RPC de Missões — Ultra-precisa e limitada ao alvo (target)
CREATE OR REPLACE FUNCTION public.fn_get_or_create_daily_missions_v5(p_couple_id UUID)
RETURNS TABLE(
    cdm_id      UUID,
    mission_id  UUID,
    title       TEXT,
    description TEXT,
    emoji       TEXT,
    mission_type TEXT,
    target_count INTEGER,
    reward_points INTEGER,
    progress    BIGINT,
    completed   BOOLEAN
) AS $$
DECLARE
    v_user_id UUID := auth.uid();
BEGIN
    -- Gerar 3 missões para hoje se ainda não existirem
    IF NOT EXISTS (
        SELECT 1 FROM public.couple_daily_missions
        WHERE couple_space_id = p_couple_id
          AND assignment_date = CURRENT_DATE
    ) THEN
        INSERT INTO public.couple_daily_missions (couple_space_id, mission_id, assignment_date)
        SELECT p_couple_id, lm.id, CURRENT_DATE
        FROM public.love_missions lm
        WHERE lm.mission_type IS NOT NULL
          AND lm.mission_type != 'general'
        ORDER BY random()
        LIMIT 3
        ON CONFLICT DO NOTHING;
    END IF;

    -- Retornar missões com progresso limitado pelo target (MIN logic)
    RETURN QUERY
    SELECT
        cdm.id                              AS cdm_id,
        cdm.mission_id,
        lm.title,
        lm.description,
        COALESCE(lm.emoji, '✨')           AS emoji,
        COALESCE(lm.mission_type, 'general') AS mission_type,
        COALESCE(lm.target_count, 1)        AS target_count,
        COALESCE(lm.reward_points, 20)      AS reward_points,
        (
            -- COUNT rigoroso limitado pelo target_count
            SELECT LEAST(COUNT(*), lm.target_count)::BIGINT
            FROM public.daily_activity da
            WHERE da.user_id = v_user_id
              AND da.couple_id = p_couple_id
              AND da.type = lm.mission_type
              AND da.created_at >= CURRENT_DATE
              AND da.created_at < (CURRENT_DATE + interval '1 day')
        )                                   AS progress,
        EXISTS(
            SELECT 1 FROM public.mission_completions mc
            WHERE mc.user_id = v_user_id
              AND mc.mission_id = cdm.mission_id
              AND mc.completed_at = CURRENT_DATE
        )                                   AS completed
    FROM public.couple_daily_missions cdm
    JOIN public.love_missions lm ON cdm.mission_id = lm.id
    WHERE cdm.couple_space_id = p_couple_id
      AND cdm.assignment_date = CURRENT_DATE
    ORDER BY completed ASC, lm.title;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Refinar checkMissionCompletion para usar a mesma lógica de contagem
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
    FOR v_mission IN
        SELECT lm.id, lm.mission_type, lm.target_count
        FROM public.couple_daily_missions cdm
        JOIN public.love_missions lm ON cdm.mission_id = lm.id
        WHERE cdm.couple_space_id = p_couple_space_id
          AND cdm.assignment_date = CURRENT_DATE
          AND (p_action_type IS NULL OR lm.mission_type = p_action_type)
    LOOP
        -- Contagem rigorosa diária
        SELECT COUNT(*) INTO v_current_count
        FROM public.daily_activity
        WHERE user_id = p_user_id
          AND couple_id = p_couple_space_id
          AND type = v_mission.mission_type
          -- Filtro de dia truncado
          AND created_at >= CURRENT_DATE
          AND created_at < (CURRENT_DATE + interval '1 day');

        -- Se atingiu ou passou o alvo, marca como concluído se ainda não foi
        IF v_current_count >= COALESCE(v_mission.target_count, 1) THEN
            IF NOT EXISTS (
                SELECT 1 FROM public.mission_completions
                WHERE user_id = p_user_id
                  AND mission_id = v_mission.id
                  AND completed_at = CURRENT_DATE
            ) THEN
                INSERT INTO public.mission_completions (user_id, mission_id, couple_space_id, completed_at)
                VALUES (p_user_id, v_mission.id, p_couple_space_id, CURRENT_DATE);
            END IF;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
