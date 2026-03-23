-- LOVE ENGINE V3: INTELLIGENT & ROBUST
-- Event-driven streak calculation and Daily Love Missions

-- 1. Table for available missions (Pool)
CREATE TABLE IF NOT EXISTS public.love_missions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    emoji TEXT NOT NULL DEFAULT '✨',
    points_reward INTEGER NOT NULL DEFAULT 20,
    category TEXT NOT NULL CHECK (category IN ('interaction', 'photo', 'voice', 'mood', 'task')),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Seed some default missions
INSERT INTO public.love_missions (title, description, emoji, points_reward, category)
VALUES 
('Elogio do Dia', 'Envia uma mensagem a dizer algo que admiras no teu par.', '💌', 15, 'interaction'),
('Partilha de Sorriso', 'Envia uma foto tua ou algo que te fez sorrir hoje.', '📸', 20, 'photo'),
('Sintonia de Humor', 'Ambos devem registar o humor hoje.', '🎭', 10, 'mood'),
('Nota de Áudio', 'Envia um áudio de pelo menos 5 segundos para o teu par.', '🎙️', 25, 'voice'),
('Planear o Futuro', 'Completem uma tarefa da vossa lista juntos.', '📅', 20, 'task')
ON CONFLICT DO NOTHING;

-- 2. Assigned Daily Mission per Couple
CREATE TABLE IF NOT EXISTS public.couple_missions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    couple_space_id UUID NOT NULL REFERENCES public.couple_spaces(id) ON DELETE CASCADE,
    mission_id UUID NOT NULL REFERENCES public.love_missions(id),
    day_key DATE NOT NULL DEFAULT CURRENT_DATE,
    is_completed_p1 BOOLEAN DEFAULT false,
    is_completed_p2 BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(couple_space_id, day_key)
);

-- 3. View for Daily Completion Status (Combines everything)
CREATE OR REPLACE VIEW public.v_daily_completion AS
WITH daily_log AS (
    SELECT 
        couple_space_id,
        user_id,
        day_key,
        count(*) as interactions
    FROM public.daily_interactions
    GROUP BY 1, 2, 3
)
SELECT 
    cs.id AS couple_space_id,
    m1.user_id AS p1_user_id,
    m2.user_id AS p2_user_id,
    COALESCE(i1.interactions, 0) > 0 AS p1_interacted,
    COALESCE(i2.interactions, 0) > 0 AS p2_interacted,
    cm.is_completed_p1,
    cm.is_completed_p2,
    lm.title AS mission_title,
    lm.description AS mission_description,
    lm.emoji AS mission_emoji,
    lm.points_reward AS mission_points,
    (COALESCE(i1.interactions, 0) > 0 AND COALESCE(i2.interactions, 0) > 0) OR (cm.is_completed_p1 AND cm.is_completed_p2) AS day_complete
FROM public.couple_spaces cs
JOIN LATERAL (SELECT user_id FROM public.members WHERE couple_space_id = cs.id ORDER BY joined_at ASC LIMIT 1) m1 ON true
JOIN LATERAL (SELECT user_id FROM public.members WHERE couple_space_id = cs.id ORDER BY joined_at DESC LIMIT 1) m2 ON true
LEFT JOIN daily_log i1 ON i1.couple_space_id = cs.id AND i1.user_id = m1.user_id AND i1.day_key = CURRENT_DATE
LEFT JOIN daily_log i2 ON i2.couple_space_id = cs.id AND i2.user_id = m2.user_id AND i2.day_key = CURRENT_DATE
LEFT JOIN public.couple_missions cm ON cm.couple_space_id = cs.id AND cm.day_key = CURRENT_DATE
LEFT JOIN public.love_missions lm ON lm.id = cm.mission_id;

-- 4. Idempotent Sync Function (The Heart of Love Engine v3)
CREATE OR REPLACE FUNCTION public.sync_streak_v3(p_couple_space_id UUID)
RETURNS JSON 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_last_sync DATE;
    v_current_streak INTEGER;
    v_shield_remaining INTEGER;
    v_check_date DATE;
    v_p1_ok BOOLEAN;
    v_p2_ok BOOLEAN;
    v_mission_ok BOOLEAN;
BEGIN
    -- Get current state
    SELECT current_streak, last_streak_date, shield_remaining 
    INTO v_current_streak, v_last_sync, v_shield_remaining
    FROM public.love_streaks
    WHERE couple_space_id = p_couple_space_id;

    -- If no record, create one
    IF NOT FOUND THEN
        INSERT INTO public.love_streaks (couple_space_id, current_streak, last_streak_date, shield_remaining)
        VALUES (p_couple_space_id, 0, CURRENT_DATE - INTERVAL '1 day', 3)
        RETURNING current_streak, last_streak_date, shield_remaining INTO v_current_streak, v_last_sync, v_shield_remaining;
    END IF;

    -- Start checking from the day after the last sync up to YESTERDAY
    v_check_date := v_last_sync + 1;
    
    WHILE v_check_date < CURRENT_DATE LOOP
        -- Check if day was complete
        SELECT 
            (SELECT count(*) > 0 FROM public.daily_interactions WHERE couple_space_id = p_couple_space_id AND day_key = v_check_date AND user_id = (SELECT user_id FROM public.members WHERE couple_space_id = p_couple_space_id ORDER BY joined_at ASC LIMIT 1)),
            (SELECT count(*) > 0 FROM public.daily_interactions WHERE couple_space_id = p_couple_space_id AND day_key = v_check_date AND user_id = (SELECT user_id FROM public.members WHERE couple_space_id = p_couple_space_id ORDER BY joined_at DESC LIMIT 1)),
            (SELECT (is_completed_p1 AND is_completed_p2) FROM public.couple_missions WHERE couple_space_id = p_couple_space_id AND day_key = v_check_date)
        INTO v_p1_ok, v_p2_ok, v_mission_ok;

        v_p1_ok := COALESCE(v_p1_ok, false);
        v_p2_ok := COALESCE(v_p2_ok, false);
        v_mission_ok := COALESCE(v_mission_ok, false);

        IF (v_p1_ok AND v_p2_ok) OR v_mission_ok THEN
            v_current_streak := v_current_streak + 1;
        ELSIF v_shield_remaining > 0 THEN
            v_shield_remaining := v_shield_remaining - 1;
            -- Streak maintained by shield
        ELSE
            v_current_streak := 0;
        END IF;

        v_last_sync := v_check_date;
        v_check_date := v_check_date + 1;
    END LOOP;

    -- NEW: If last_sync is still before yesterday (meaning we didn't enter the loop or loop ended early)
    -- but no days were missed today, update last_sync to CURRENT_DATE - 1 to stop the "Streak Lost" alert.
    IF v_last_sync < (CURRENT_DATE - 1) THEN
        v_last_sync := CURRENT_DATE - 1;
    END IF;

    -- Update the streak record
    UPDATE public.love_streaks
    SET 
        current_streak = v_current_streak,
        last_streak_date = v_last_sync,
        shield_remaining = v_shield_remaining,
        updated_at = now()
    WHERE couple_space_id = p_couple_space_id;

    -- Robust Mission Assignment for TODAY
    IF NOT EXISTS (SELECT 1 FROM public.couple_missions WHERE couple_space_id = p_couple_space_id AND day_key = CURRENT_DATE) THEN
        -- Pick a random mission that hasn't been used recently if possible
        INSERT INTO public.couple_missions (couple_space_id, mission_id)
        SELECT p_couple_space_id, id FROM public.love_missions 
        WHERE id NOT IN (SELECT mission_id FROM public.couple_missions WHERE couple_space_id = p_couple_space_id ORDER BY day_key DESC LIMIT 5)
        ORDER BY random() LIMIT 1;
        
        -- Fallback to any mission if none left in subquery
        IF NOT FOUND THEN
            INSERT INTO public.couple_missions (couple_space_id, mission_id)
            SELECT p_couple_space_id, id FROM public.love_missions ORDER BY random() LIMIT 1;
        END IF;
    END IF;

    RETURN json_build_object(
        'current_streak', v_current_streak,
        'shield_remaining', v_shield_remaining,
        'last_sync', v_last_sync
    );
END;
$$;

-- 5. Trigger update for Missions completion
CREATE OR REPLACE FUNCTION public.update_mission_on_interaction()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_mission_cat TEXT;
BEGIN
    -- Get current mission category for this couple today
    SELECT lm.category INTO v_mission_cat
    FROM public.couple_missions cm
    JOIN public.love_missions lm ON cm.mission_id = lm.id
    WHERE cm.couple_space_id = NEW.couple_space_id AND cm.day_key = CURRENT_DATE;

    IF v_mission_cat IS NOT NULL THEN
        -- If interaction matches mission type, mark as completed for this user
        UPDATE public.couple_missions
        SET 
            is_completed_p1 = CASE 
                WHEN (SELECT user_id FROM public.members WHERE couple_space_id = NEW.couple_space_id ORDER BY joined_at ASC LIMIT 1) = NEW.user_id 
                THEN true 
                ELSE is_completed_p1 
            END,
            is_completed_p2 = CASE 
                WHEN (SELECT user_id FROM public.members WHERE couple_space_id = NEW.couple_space_id ORDER BY joined_at DESC LIMIT 1) = NEW.user_id 
                THEN true 
                ELSE is_completed_p2 
            END
        WHERE couple_space_id = NEW.couple_space_id AND day_key = CURRENT_DATE;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_update_mission ON public.daily_interactions;
CREATE TRIGGER tr_update_mission AFTER INSERT ON public.daily_interactions FOR EACH ROW EXECUTE FUNCTION public.update_mission_on_interaction();
