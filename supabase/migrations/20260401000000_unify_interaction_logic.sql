-- 1. UNIFY INTERACTION LOGIC (daily_activity -> missions)
-- Redefine checkMissionCompletion to use daily_activity instead of interactions

CREATE OR REPLACE FUNCTION public.checkMissionCompletion(p_couple_space_id UUID, p_user_id UUID)
RETURNS VOID AS $$
DECLARE
    v_mission RECORD;
    v_current_count INTEGER;
BEGIN
    -- For each mission assigned to this couple today
    FOR v_mission IN 
        SELECT lm.*, cdm.id as couple_mission_id
        FROM public.couple_daily_missions cdm
        JOIN public.love_missions lm ON cdm.mission_id = lm.id
        WHERE cdm.couple_space_id = p_couple_space_id 
        AND cdm.assignment_date = CURRENT_DATE
    LOOP
        -- Count how many activities of this type the user has today
        -- Using daily_activity which is the primary unified table
        SELECT COUNT(*) INTO v_current_count
        FROM public.daily_activity
        WHERE user_id = p_user_id
        AND couple_id = p_couple_space_id
        AND type = v_mission.mission_type
        AND created_at::DATE = CURRENT_DATE;

        -- If threshold reached, check if already completed
        IF v_current_count >= v_mission.target_count THEN
            IF NOT EXISTS (
                SELECT 1 FROM public.mission_completions
                WHERE user_id = p_user_id
                AND mission_id = v_mission.id
                AND completed_at::DATE = CURRENT_DATE
            ) THEN
                INSERT INTO public.mission_completions (user_id, mission_id, couple_space_id, completed_at)
                VALUES (p_user_id, v_mission.id, p_couple_space_id, CURRENT_DATE);
                
                -- Points are already awarded via tr_mission_completion_points_trigger
            END IF;
        END IF;
    LOOP END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-attach trigger to daily_activity
DROP TRIGGER IF EXISTS tr_daily_activity_mission_trigger ON public.daily_activity;
CREATE TRIGGER tr_daily_activity_mission_trigger
AFTER INSERT ON public.daily_activity
FOR EACH ROW EXECUTE FUNCTION public.tr_on_interaction_for_missions();

-- 2. EXPAND MISSION LIBRARY (LEQUE DE MISSÕES)
DELETE FROM public.love_missions WHERE mission_type != 'general';

INSERT INTO public.love_missions (title, description, reward_points, mission_type, target_count, emoji, category) VALUES
-- Chat / Interaction
('Tagarelas 💬', 'Enviem 5 mensagens no chat um ao outro hoje.', 20, 'message_sent', 5, '💬', 'interaction'),
('Carinhos Virtuais 💖', 'Envie 2 mensagens de carinho ou toques hoje.', 15, 'message_sent', 2, '💖', 'interaction'),
('Elogio do Dia ✨', 'Mande um elogio especial para o seu par no chat.', 10, 'message_sent', 1, '✨', 'interaction'),
('Conversa Longa 📱', 'Mande pelo menos 10 mensagens durante o dia.', 30, 'message_sent', 10, '📱', 'interaction'),

-- Mood / Humour
('Transparência 😊', 'Registe o seu humor de hoje para o seu parceiro ver.', 15, 'mood_logged', 1, '😊', 'mood'),
('Sintonia de Humor 🧠', 'Registem ambos o humor hoje (Missão individual).', 20, 'mood_logged', 1, '🧠', 'mood'),

-- Plano / Agenda
('Foco no Par 📅', 'Conclua um item da sua Agenda/Plano hoje.', 25, 'plan_completed', 1, '📅', 'task'),
('Produtividade Juntos 🎯', 'Conclua 2 itens da agenda do casal hoje.', 40, 'plan_completed', 2, '🎯', 'task'),

-- Routine / Tasks
('Hábitos Fortes 📋', 'Marque 3 hábitos como concluídos na sua rotina.', 30, 'task_completed', 3, '📋', 'task'),
('Rotina Completa ✅', 'Marque 5 hábitos na sua checklist diária.', 50, 'task_completed', 5, '✅', 'task'),
('Bom Começo 🌅', 'Marque 1 hábito de manhã na rotina.', 15, 'task_completed', 1, '🌅', 'task'),

-- Spiritual / Togetherness
('Oração Juntos 🙏', 'Registe um tempo de oração ou reflexão hoje.', 25, 'prayer_completed', 1, '🙏', 'spiritual'),
('Gratidão 🙌', 'Registe algo pelo qual é grato no dia de hoje.', 20, 'gratitude_logged', 1, '🙌', 'spiritual'),
('Momento Versículo 📖', 'Partilhe um versículo ou frase inspiradora no chat.', 15, 'message_sent', 1, '📖', 'spiritual');

-- 3. SHIELD SHOP LOGIC (PONTOS -> ESCUDOS)
CREATE OR REPLACE FUNCTION public.fn_purchase_loveshield_v5(p_user_id UUID, p_couple_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_points BIGINT;
    v_cost INTEGER := 100; -- Custo sugerido no plano
BEGIN
    -- Check points
    SELECT points INTO v_points FROM public.love_points 
    WHERE user_id = p_user_id AND couple_space_id = p_couple_id;
    
    IF v_points < v_cost OR v_points IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Pontos insuficientes. Precisas de 100 pontos.');
    END IF;
    
    -- Deduct points
    UPDATE public.love_points 
    SET points = points - v_cost, updated_at = now()
    WHERE user_id = p_user_id AND couple_space_id = p_couple_id;
    
    -- Add entry to history
    INSERT INTO public.love_points_history (user_id, couple_space_id, amount, reason)
    VALUES (p_user_id, p_couple_id, -v_cost, 'purchase_shield');
    
    -- Increment shield quantity
    INSERT INTO public.shields (couple_id, quantity, updated_at)
    VALUES (p_couple_id, 1, now())
    ON CONFLICT (couple_id) 
    DO UPDATE SET 
        quantity = public.shields.quantity + 1,
        updated_at = now();
        
    RETURN jsonb_build_object('success', true, 'message', 'Escudo comprado com sucesso!');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
