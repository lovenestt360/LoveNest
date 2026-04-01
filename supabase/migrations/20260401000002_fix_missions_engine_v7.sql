-- ============================================================
-- MISSÕES V7 — CORREÇÃO DEFINITIVA DO MOTOR
-- Problemas resolvidos:
--   1. Cria o RPC fn_get_or_create_daily_missions_v5 (ausente)
--   2. Adiciona colunas type e created_at à daily_activity
-- ============================================================

-- FASE 1: Corrigir a tabela daily_activity
ALTER TABLE public.daily_activity ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'general';
ALTER TABLE public.daily_activity ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

-- FASE 2: Criar a RPC principal que o frontend chama
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

    -- Retornar missões com progresso e estado de conclusão
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
            SELECT COUNT(*)::BIGINT
            FROM public.daily_activity da
            WHERE da.user_id = v_user_id
              AND da.couple_id = p_couple_id
              AND da.type = lm.mission_type
              AND da.created_at::DATE = CURRENT_DATE
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

-- FASE 3: Corrigir checkMissionCompletion para usar daily_activity com type
CREATE OR REPLACE FUNCTION public.checkMissionCompletion(p_couple_space_id UUID, p_user_id UUID)
RETURNS VOID AS $$
DECLARE
    v_mission RECORD;
    v_current_count BIGINT;
BEGIN
    FOR v_mission IN
        SELECT lm.id, lm.mission_type, lm.target_count, cdm.id AS couple_mission_id
        FROM public.couple_daily_missions cdm
        JOIN public.love_missions lm ON cdm.mission_id = lm.id
        WHERE cdm.couple_space_id = p_couple_space_id
          AND cdm.assignment_date = CURRENT_DATE
    LOOP
        SELECT COUNT(*) INTO v_current_count
        FROM public.daily_activity
        WHERE user_id = p_user_id
          AND couple_id = p_couple_space_id
          AND type = v_mission.mission_type
          AND created_at::DATE = CURRENT_DATE;

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

-- FASE 4: Assegurar insert policy na daily_activity (com a nova coluna type)
DROP POLICY IF EXISTS "Users can insert/update their own activity" ON public.daily_activity;
CREATE POLICY "Users can insert/update their own activity"
    ON public.daily_activity FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
