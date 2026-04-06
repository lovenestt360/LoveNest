-- ============================================================
-- MIGRATION: BACKEND TO couple_space_id (V12)
-- Objetivo: Alinhamento total com o frontend e motor de missões v10.
-- ============================================================

-- 1. ADICIONAR COLUNAS SE AINDA NÃO EXISTIREM (COEXISTÊNCIA)
ALTER TABLE public.streaks ADD COLUMN IF NOT EXISTS couple_space_id UUID REFERENCES public.couple_spaces(id) ON DELETE CASCADE;
ALTER TABLE public.shields ADD COLUMN IF NOT EXISTS couple_space_id UUID REFERENCES public.couple_spaces(id) ON DELETE CASCADE;
ALTER TABLE public.daily_activity ADD COLUMN IF NOT EXISTS couple_space_id UUID REFERENCES public.couple_spaces(id) ON DELETE CASCADE;

-- 2. ATUALIZAR RPC DE MISSÕES
CREATE OR REPLACE FUNCTION public.fn_get_or_create_daily_missions_v5(p_couple_space_id UUID)
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
        WHERE couple_space_id = p_couple_space_id
          AND assignment_date = CURRENT_DATE
    ) THEN
        INSERT INTO public.couple_daily_missions (couple_space_id, mission_id, assignment_date)
        SELECT p_couple_space_id, lm.id, CURRENT_DATE
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
            -- COUNT rigoroso baseado em couple_space_id
            SELECT LEAST(COUNT(*), lm.target_count)::BIGINT
            FROM public.daily_activity da
            WHERE da.user_id = v_user_id
              AND da.couple_space_id = p_couple_space_id
              AND da.type = lm.mission_type
              AND da.created_at >= CURRENT_DATE
              AND da.created_at < (CURRENT_DATE + interval '1 day')
        )                                   AS progress,
        EXISTS(
            SELECT 1 FROM public.mission_completions mc
            WHERE mc.user_id = v_user_id
              AND mc.mission_id = cdm.mission_id
              AND mc.couple_space_id = p_couple_space_id
              AND mc.completed_at = CURRENT_DATE
        )                                   AS completed
    FROM public.couple_daily_missions cdm
    JOIN public.love_missions lm ON cdm.mission_id = lm.id
    WHERE cdm.couple_space_id = p_couple_space_id
      AND cdm.assignment_date = CURRENT_DATE
    ORDER BY completed ASC, lm.title;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. REFINAR checkMissionCompletion
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
        -- Contagem baseada em couple_space_id
        SELECT COUNT(*) INTO v_current_count
        FROM public.daily_activity
        WHERE user_id = p_user_id
          AND couple_space_id = p_couple_space_id
          AND type = v_mission.mission_type
          AND created_at >= CURRENT_DATE
          AND created_at < (CURRENT_DATE + interval '1 day');

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

-- 4. REPROPOR STATUS DIÁRIO
CREATE OR REPLACE FUNCTION public.get_couple_daily_status(p_couple_space_id UUID)
RETURNS TABLE (
    me_active BOOLEAN,
    partner_active BOOLEAN
) AS $$
DECLARE
    v_user_id     UUID := auth.uid();
    v_partner_id  UUID;
BEGIN
    -- Obter o parceiro
    SELECT user_id INTO v_partner_id
    FROM public.members
    WHERE couple_space_id = p_couple_space_id AND user_id != v_user_id
    LIMIT 1;

    RETURN QUERY
    SELECT 
        EXISTS (
            SELECT 1 FROM public.daily_activity 
            WHERE user_id = v_user_id 
              AND couple_space_id = p_couple_space_id 
              AND created_at >= CURRENT_DATE
        ) AS me_active,
        EXISTS (
            SELECT 1 FROM public.daily_activity 
            WHERE user_id = v_partner_id 
              AND couple_space_id = p_couple_space_id 
              AND created_at >= CURRENT_DATE
        ) AS partner_active;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. REPROPOR MOTOR DE STREAKS (fn_update_streak_v5)
CREATE OR REPLACE FUNCTION public.fn_update_streak_v5()
RETURNS TRIGGER AS $$
DECLARE
    v_last_valid    DATE;
    v_current_streak INTEGER;
    v_today         DATE := CURRENT_DATE;
    v_space_id      UUID;
BEGIN
    -- No trigger, NEW.couple_space_id é garantido
    v_space_id := NEW.couple_space_id;

    -- Obter estado atual do streak para este espaço
    SELECT last_valid_day, current_streak 
    INTO v_last_valid, v_current_streak
    FROM public.streaks 
    WHERE couple_space_id = v_space_id;

    IF NOT FOUND THEN
        -- BACKFILL SE EXISTIA COM couple_id
        SELECT last_valid_day, current_streak 
        INTO v_last_valid, v_current_streak
        FROM public.streaks 
        WHERE couple_id = v_space_id; -- No caso de couple_id e space_id serem o mesmo UUID em alguns casos

        INSERT INTO public.streaks (couple_space_id, current_streak, last_valid_day)
        VALUES (v_space_id, COALESCE(v_current_streak, 1), COALESCE(v_last_valid, v_today))
        ON CONFLICT DO NOTHING;
        RETURN NEW;
    END IF;

    IF v_last_valid = v_today THEN
        RETURN NEW;
    ELSIF v_last_valid = (v_today - INTERVAL '1 day')::DATE THEN
        UPDATE public.streaks 
        SET current_streak = current_streak + 1,
            last_valid_day = v_today,
            updated_at = now()
        WHERE couple_space_id = v_space_id;
    ELSE
        UPDATE public.streaks 
        SET current_streak = 1,
            last_valid_day = v_today,
            updated_at = now()
        WHERE couple_space_id = v_space_id;
    END IF;

    -- Ativar verificação de missões
    PERFORM public.checkMissionCompletion(v_space_id, NEW.user_id, NEW.type);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. REPROPOR COMPRA DE ESCUDO
CREATE OR REPLACE FUNCTION public.fn_purchase_loveshield_v5(p_user_id UUID, p_couple_space_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_points BIGINT;
    v_cost   INTEGER := 100;
BEGIN
    SELECT points INTO v_points FROM public.love_points 
    WHERE user_id = p_user_id AND couple_space_id = p_couple_space_id;
    
    IF v_points < v_cost OR v_points IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Pontos insuficientes.');
    END IF;
    
    UPDATE public.love_points 
    SET points = points - v_cost, updated_at = now()
    WHERE user_id = p_user_id AND couple_space_id = p_couple_space_id;
    
    INSERT INTO public.shields (couple_space_id, quantity, updated_at)
    VALUES (p_couple_space_id, 1, now())
    ON CONFLICT (couple_space_id) 
    DO UPDATE SET quantity = public.shields.quantity + 1, updated_at = now();
        
    RETURN jsonb_build_object('success', true, 'message', 'Escudo comprado!');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. ATUALIZAR RANKING GLOBAL
CREATE OR REPLACE FUNCTION public.fn_get_global_ranking(p_rank_type TEXT)
RETURNS TABLE (
    couple_space_id UUID,
    current_streak INTEGER,
    total_points BIGINT,
    house_name TEXT,
    house_image TEXT,
    is_verified BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.couple_space_id,
        s.current_streak,
        COALESCE((SELECT SUM(points) FROM public.love_points lp WHERE lp.couple_space_id = s.couple_space_id), 0)::BIGINT AS total_points,
        cs.house_name,
        cs.house_image,
        cs.is_verified
    FROM public.streaks s
    JOIN public.couple_spaces cs ON s.couple_space_id = cs.id
    ORDER BY 
        CASE WHEN p_rank_type = 'total_points' THEN 3 ELSE 2 END DESC,
        CASE WHEN p_rank_type = 'total_points' THEN 2 ELSE 3 END DESC
    LIMIT 50;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. RECONECTAR TRIGGERS NA daily_activity
DROP TRIGGER IF EXISTS tr_update_streak_on_activity ON public.daily_activity;
DROP TRIGGER IF EXISTS tr_daily_activity_mission_trigger ON public.daily_activity;

CREATE TRIGGER tr_update_streak_on_activity
AFTER INSERT ON public.daily_activity
FOR EACH ROW EXECUTE FUNCTION public.fn_update_streak_v5();
