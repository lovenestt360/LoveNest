-- Love Engine: Event-Driven Interaction System
-- Migration to centralize all love activities and automate streaks/missions

-- 1. Create a centralized event log
CREATE TABLE IF NOT EXISTS public.love_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    couple_space_id UUID NOT NULL REFERENCES public.couple_spaces(id),
    event_type TEXT NOT NULL, -- 'message', 'task', 'memory', 'mood', 'app_open'
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS for love_events
ALTER TABLE public.love_events ENABLE ROW LEVEL SECURITY;

-- SAFE POLICY CREATION
DROP POLICY IF EXISTS "Users can insert their own events" ON public.love_events;
CREATE POLICY "Users can insert their own events" 
ON public.love_events FOR INSERT 
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Couples can see each other's events" ON public.love_events;
CREATE POLICY "Couples can see each other's events" 
ON public.love_events FOR SELECT 
USING (
    couple_space_id IN (
        SELECT id FROM public.couple_spaces 
        WHERE id = love_events.couple_space_id
    )
);

-- 2. Create a refined streak log for daily tracking
CREATE TABLE IF NOT EXISTS public.streak_daily_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    couple_space_id UUID NOT NULL REFERENCES public.couple_spaces(id),
    day_key TEXT NOT NULL, -- 'YYYY-MM-DD'
    user_id UUID NOT NULL REFERENCES auth.users(id),
    has_activity BOOLEAN DEFAULT TRUE,
    last_activity_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(couple_space_id, day_key, user_id)
);

-- Enable RLS for streak_daily_logs
ALTER TABLE public.streak_daily_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Couples can view daily logs" ON public.streak_daily_logs;
CREATE POLICY "Couples can view daily logs" 
ON public.streak_daily_logs FOR SELECT 
USING (couple_space_id IN (SELECT id FROM couple_spaces));

-- 3. Enhance micro_challenges with trigger logic
ALTER TABLE public.micro_challenges 
ADD COLUMN IF NOT EXISTS trigger_type TEXT, -- 'message', 'task', etc.
ADD COLUMN IF NOT EXISTS min_requirement INTEGER DEFAULT 0; -- e.g. min message length

-- 4. Central Love Engine Function
CREATE OR REPLACE FUNCTION public.process_love_event()
RETURNS TRIGGER AS $$
DECLARE
    v_partner_id UUID;
    v_has_partner_activity BOOLEAN;
    v_current_streak INTEGER;
    v_last_streak_date DATE;
    v_yesterday DATE;
    v_today DATE;
    v_is_active_both_yesterday BOOLEAN;
BEGIN
    v_today := CURRENT_DATE;
    v_yesterday := v_today - INTERVAL '1 day';

    -- A. Update daily activity log
    INSERT INTO public.streak_daily_logs (couple_space_id, day_key, user_id)
    VALUES (NEW.couple_space_id, to_char(v_today, 'YYYY-MM-DD'), NEW.user_id)
    ON CONFLICT (couple_space_id, day_key, user_id) 
    DO UPDATE SET last_activity_at = EXCLUDED.last_activity_at;

    -- B. Handle LoveStreak Logic
    -- Check if BOTH users are active today
    SELECT EXISTS (
        SELECT 1 FROM public.streak_daily_logs 
        WHERE couple_space_id = NEW.couple_space_id 
        AND day_key = to_char(v_today, 'YYYY-MM-DD') 
        AND user_id != NEW.user_id
    ) INTO v_has_partner_activity;

    -- 4. Unified Streak Update (Compatibility Mode)
    -- We update the flags and the streak in one go
    SELECT user1_id, user2_id INTO v_u1, v_u2 FROM public.couple_spaces WHERE id = NEW.couple_space_id;

    IF v_has_partner_activity THEN
        SELECT current_streak, last_streak_date INTO v_current_streak, v_last_streak_date 
        FROM public.love_streaks WHERE couple_space_id = NEW.couple_space_id;

        -- RECOVERY: Check if both were active yesterday
        SELECT EXISTS (
          SELECT 1 FROM streak_daily_logs WHERE couple_space_id = NEW.couple_space_id AND day_key = to_char(v_yesterday, 'YYYY-MM-DD') AND user_id = NEW.user_id
        ) AND EXISTS (
          SELECT 1 FROM streak_daily_logs WHERE couple_space_id = NEW.couple_space_id AND day_key = to_char(v_yesterday, 'YYYY-MM-DD') AND user_id != NEW.user_id
        ) INTO v_is_active_both_yesterday;

        -- Update streak AND flags
        UPDATE public.love_streaks 
        SET current_streak = CASE 
                WHEN v_last_streak_date = v_today THEN current_streak
                WHEN v_last_streak_date = v_yesterday OR v_is_active_both_yesterday THEN COALESCE(v_current_streak, 0) + 1
                ELSE 1
            END,
            last_streak_date = v_today,
            partner1_interacted_today = CASE WHEN v_u1 = NEW.user_id THEN TRUE ELSE partner1_interacted_today END,
            partner2_interacted_today = CASE WHEN v_u2 = NEW.user_id THEN TRUE ELSE partner2_interacted_today END,
            interaction_date = v_today,
            updated_at = now()
        WHERE couple_space_id = NEW.couple_space_id;
    ELSE
        -- Only one has interacted, update flags only
        UPDATE public.love_streaks 
        SET partner1_interacted_today = CASE 
                WHEN interaction_date != v_today THEN (v_u1 = NEW.user_id)
                ELSE (partner1_interacted_today OR (v_u1 = NEW.user_id))
            END,
            partner2_interacted_today = CASE 
                WHEN interaction_date != v_today THEN (v_u2 = NEW.user_id)
                ELSE (partner2_interacted_today OR (v_u2 = NEW.user_id))
            END,
            interaction_date = v_today,
            updated_at = now()
        WHERE couple_space_id = NEW.couple_space_id;
    END IF;

    -- C. Auto-complete Missions
    INSERT INTO public.micro_challenge_completions (couple_space_id, challenge_id, user_id, day_key, completed)
    SELECT 
        NEW.couple_space_id,
        mc.id,
        NEW.user_id,
        to_char(v_today, 'YYYY-MM-DD')::date,
        TRUE
    FROM public.micro_challenges mc
    WHERE (mc.trigger_type = NEW.event_type OR mc.challenge_type = NEW.event_type)
    AND (
        (NEW.event_type = 'message' AND (NEW.metadata->>'length')::int >= mc.min_requirement) OR
        (NEW.event_type != 'message')
    )
    ON CONFLICT (couple_space_id, challenge_id, user_id, day_key) DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger
DROP TRIGGER IF EXISTS on_love_event_inserted ON public.love_events;
CREATE TRIGGER on_love_event_inserted
AFTER INSERT ON public.love_events
FOR EACH ROW EXECUTE FUNCTION public.process_love_event();

-- 5. Update existing challenges with trigger types
UPDATE public.micro_challenges SET trigger_type = 'message', min_requirement = 10 WHERE challenge_text ILIKE '%mensagem carinhosa%';
UPDATE public.micro_challenges SET trigger_type = 'message', min_requirement = 1 WHERE challenge_text ILIKE '%emoji%';
UPDATE public.micro_challenges SET trigger_type = 'memory', min_requirement = 1 WHERE challenge_text ILIKE '%memória%';
UPDATE public.micro_challenges SET trigger_type = 'task', min_requirement = 1 WHERE challenge_text ILIKE '%tarefa%';
UPDATE public.micro_challenges SET trigger_type = 'mood', min_requirement = 1 WHERE challenge_text ILIKE '%humor%';
UPDATE public.micro_challenges SET trigger_type = 'prayer', min_requirement = 1 WHERE challenge_text ILIKE '%oração%';
UPDATE public.micro_challenges SET trigger_type = 'message', min_requirement = 20 WHERE challenge_text ILIKE '%3 coisas que adoram%';
UPDATE public.micro_challenges SET trigger_type = 'message', min_requirement = 5 WHERE challenge_text ILIKE '%bom dia%';
UPDATE public.micro_challenges SET trigger_type = 'message', min_requirement = 10 WHERE challenge_text ILIKE '%elogio%';
UPDATE public.micro_challenges SET trigger_type = 'message', min_requirement = 10 WHERE challenge_text ILIKE '%música%';

-- 5. Streak Recovery & Reliability Helper
CREATE OR REPLACE FUNCTION public.recalculate_couple_streak(p_couple_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_streak INTEGER := 0;
    v_date DATE := CURRENT_DATE;
    v_active_both BOOLEAN;
    v_u1 UUID;
    v_u2 UUID;
BEGIN
    SELECT user1_id, user2_id INTO v_u1, v_u2 FROM couple_spaces WHERE id = p_couple_id;

    LOOP
        SELECT EXISTS (
            SELECT 1 FROM streak_daily_logs WHERE couple_space_id = p_couple_id AND day_key = to_char(v_date, 'YYYY-MM-DD') AND user_id = v_u1
        ) AND EXISTS (
            SELECT 1 FROM streak_daily_logs WHERE couple_space_id = p_couple_id AND day_key = to_char(v_date, 'YYYY-MM-DD') AND user_id = v_u2
        ) INTO v_active_both;

        IF v_active_both THEN
            v_streak := v_streak + 1;
            v_date := v_date - INTERVAL '1 day';
        ELSE
            IF v_date = CURRENT_DATE THEN
                v_date := v_date - INTERVAL '1 day';
                CONTINUE;
            ELSE
                EXIT;
            END IF;
        END IF;
    END LOOP;

    UPDATE love_streaks SET current_streak = v_streak, last_streak_date = CURRENT_DATE WHERE couple_space_id = p_couple_id;

    RETURN v_streak;
END;
$$ LANGUAGE plpgsql;
