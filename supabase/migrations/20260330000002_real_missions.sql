-- 1. ENHANCE MISSION LIBRARY
ALTER TABLE public.love_missions ADD COLUMN IF NOT EXISTS mission_type TEXT DEFAULT 'general';
ALTER TABLE public.love_missions ADD COLUMN IF NOT EXISTS target_count INTEGER DEFAULT 1;
ALTER TABLE public.love_missions ADD COLUMN IF NOT EXISTS emoji TEXT DEFAULT '✨';

-- 2. COUPLE DAILY MISSIONS (The 3 assigned missions for today)
CREATE TABLE IF NOT EXISTS public.couple_daily_missions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    couple_space_id UUID REFERENCES public.couple_spaces(id) ON DELETE CASCADE,
    mission_id UUID REFERENCES public.love_missions(id) ON DELETE CASCADE,
    assignment_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(couple_space_id, mission_id, assignment_date)
);

-- Enable RLS for couple_daily_missions
ALTER TABLE public.couple_daily_missions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view their daily missions"
    ON public.couple_daily_missions FOR SELECT
    USING (
        couple_space_id IN (
            SELECT couple_space_id FROM public.members WHERE user_id = auth.uid()
        )
    );

-- 3. GENERATE MISSIONS FUNCTION
CREATE OR REPLACE FUNCTION public.generateDailyMissions(p_couple_space_id UUID)
RETURNS VOID AS $$
BEGIN
    -- Check if we already have missions for today
    IF NOT EXISTS (
        SELECT 1 FROM public.couple_daily_missions 
        WHERE couple_space_id = p_couple_space_id AND assignment_date = CURRENT_DATE
    ) THEN
        -- Assign 3 random missions from the library
        INSERT INTO public.couple_daily_missions (couple_space_id, mission_id, assignment_date)
        SELECT p_couple_space_id, id, CURRENT_DATE
        FROM public.love_missions
        WHERE mission_type != 'general'
        ORDER BY random()
        LIMIT 3;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. CHECK MISSION COMPLETION ENGINE
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
        -- Count how many interactions of this type the user has today
        SELECT COUNT(*) INTO v_current_count
        FROM public.interactions
        WHERE user_id = p_user_id
        AND couple_space_id = p_couple_space_id
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
            END IF;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. TRIGGER ON INTERACTIONS
CREATE OR REPLACE FUNCTION public.tr_on_interaction_for_missions()
RETURNS TRIGGER AS $$
BEGIN
    -- Ensure missions are generated for the day if not yet done
    PERFORM public.generateDailyMissions(NEW.couple_space_id);
    
    -- Check if this interaction completes any mission
    PERFORM public.checkMissionCompletion(NEW.couple_space_id, NEW.user_id);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_interactions_mission_trigger ON public.interactions;
CREATE TRIGGER tr_interactions_mission_trigger
AFTER INSERT ON public.interactions
FOR EACH ROW EXECUTE FUNCTION public.tr_on_interaction_for_missions();

-- 6. SEED REAL MISSIONS
DELETE FROM public.love_missions WHERE mission_type != 'general';

INSERT INTO public.love_missions (title, description, reward_points, mission_type, target_count, emoji, category) VALUES
('Tagarelas 💬', 'Enviem 5 mensagens no chat um ao outro hoje.', 20, 'message_sent', 5, '💬', 'interaction'),
('Transparência 😊', 'Registe o seu humor de hoje para o seu parceiro ver.', 15, 'mood_logged', 1, '😊', 'mood'),
('Foco no Par 📅', 'Conclua um item da sua Agenda/Plano hoje.', 25, 'plan_completed', 1, '📅', 'task'),
('Hábitos Fortes 📋', 'Marque 3 hábitos como concluídos na sua rotina.', 30, 'task_completed', 3, '📋', 'task'),
('Carinhos Virtuais 💖', 'Envie 2 mensagens de carinho ou toques hoje.', 15, 'message_sent', 2, '💖', 'interaction');
