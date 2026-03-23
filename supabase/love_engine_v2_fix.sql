-- Love Engine v2 Fix: Robust Points & Mission Automation
-- This script integrates point awarding into the mission completion flow.

-- 1. Ensure the point system trigger exists and is robust
CREATE OR REPLACE FUNCTION public.handle_micro_challenge_completion()
RETURNS TRIGGER AS $$
DECLARE
    v_points INTEGER;
BEGIN
    -- Get points from micro_challenges
    SELECT points INTO v_points 
    FROM public.micro_challenges 
    WHERE id = NEW.challenge_id;

    -- Update total_points in love_streaks
    UPDATE public.love_streaks 
    SET total_points = COALESCE(total_points, 0) + COALESCE(v_points, 0),
        updated_at = now()
    WHERE couple_space_id = NEW.couple_space_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_micro_challenge_completion ON public.micro_challenge_completions;
CREATE TRIGGER on_micro_challenge_completion
AFTER INSERT ON public.micro_challenge_completions
FOR EACH ROW EXECUTE FUNCTION public.handle_micro_challenge_completion();

-- 2. Refine process_love_event for better mission matching
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
    v_u1 UUID;
    v_u2 UUID;
BEGIN
    -- Use America/Sao_Paulo (User timezone) for consistency if possible, else CURRENT_DATE
    v_today := CURRENT_DATE;
    v_yesterday := v_today - INTERVAL '1 day';

    -- A. Update daily activity log
    INSERT INTO public.streak_daily_logs (couple_space_id, day_key, user_id)
    VALUES (NEW.couple_space_id, to_char(v_today, 'YYYY-MM-DD'), NEW.user_id)
    ON CONFLICT (couple_space_id, day_key, user_id) 
    DO UPDATE SET last_activity_at = EXCLUDED.last_activity_at;

    -- B. Handle LoveStreak Logic
    SELECT user1_id, user2_id INTO v_u1, v_u2 FROM public.couple_spaces WHERE id = NEW.couple_space_id;
    
    SELECT EXISTS (
        SELECT 1 FROM public.streak_daily_logs 
        WHERE couple_space_id = NEW.couple_space_id 
        AND day_key = to_char(v_today, 'YYYY-MM-DD') 
        AND user_id != NEW.user_id
    ) INTO v_has_partner_activity;

    IF v_has_partner_activity THEN
        SELECT current_streak, last_streak_date INTO v_current_streak, v_last_streak_date 
        FROM public.love_streaks WHERE couple_space_id = NEW.couple_space_id;

        SELECT EXISTS (
          SELECT 1 FROM streak_daily_logs WHERE couple_space_id = NEW.couple_space_id AND day_key = to_char(v_yesterday, 'YYYY-MM-DD') AND user_id = NEW.user_id
        ) AND EXISTS (
          SELECT 1 FROM streak_daily_logs WHERE couple_space_id = NEW.couple_space_id AND day_key = to_char(v_yesterday, 'YYYY-MM-DD') AND user_id != NEW.user_id
        ) INTO v_is_active_both_yesterday;

        UPDATE public.love_streaks 
        SET current_streak = CASE 
                WHEN last_streak_date = v_today THEN current_streak
                WHEN last_streak_date = v_yesterday OR v_is_active_both_yesterday THEN COALESCE(v_current_streak, 0) + 1
                ELSE 1
            END,
            last_streak_date = v_today,
            partner1_interacted_today = CASE WHEN v_u1 = NEW.user_id THEN TRUE ELSE partner1_interacted_today END,
            partner2_interacted_today = CASE WHEN v_u2 = NEW.user_id THEN TRUE ELSE partner2_interacted_today END,
            interaction_date = v_today,
            updated_at = now()
        WHERE couple_space_id = NEW.couple_space_id;
    ELSE
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

    -- C. Auto-complete Missions (Improved Matching)
    INSERT INTO public.micro_challenge_completions (couple_space_id, challenge_id, user_id, day_key, completed)
    SELECT 
        NEW.couple_space_id,
        mc.id,
        NEW.user_id,
        v_today,
        TRUE
    FROM public.micro_challenges mc
    WHERE (mc.trigger_type = NEW.event_type OR mc.challenge_type = NEW.event_type)
    AND (
        -- For tasks, check metadata to match mission intent
        (NEW.event_type = 'task' AND (
            (mc.challenge_text ILIKE '%completem%' AND NEW.metadata->>'action' = 'completed') OR
            (mc.challenge_text ILIKE '%planeiem%' AND NEW.metadata->>'action' = 'created') OR
            (mc.challenge_text ILIKE '%adicione%' AND NEW.metadata->>'action' = 'created') OR
            (mc.challenge_text NOT ILIKE '%completem%' AND mc.challenge_text NOT ILIKE '%planeiem%' AND mc.challenge_text NOT ILIKE '%adicione%')
        )) OR
        (NEW.event_type = 'message' AND (NEW.metadata->>'length')::int >= mc.min_requirement) OR
        (NEW.event_type NOT IN ('task', 'message'))
    )
    ON CONFLICT (couple_space_id, challenge_id, user_id, day_key) DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Update Mission trigger types for better matching
UPDATE public.micro_challenges SET trigger_type = 'task' WHERE challenge_type = 'task';
UPDATE public.micro_challenges SET trigger_type = 'message' WHERE challenge_type = 'message';
UPDATE public.micro_challenges SET trigger_type = 'memory' WHERE challenge_type = 'memory';
UPDATE public.micro_challenges SET trigger_type = 'mood' WHERE challenge_type = 'mood';
UPDATE public.micro_challenges SET trigger_type = 'prayer' WHERE challenge_type = 'prayer';

-- 4. Initial Points Sync (Ensure everyone has correct points from past completions)
UPDATE public.love_streaks ls
SET total_points = (
    SELECT COALESCE(SUM(mc.points), 0)
    FROM public.micro_challenge_completions mcc
    JOIN public.micro_challenges mc ON mc.id = mcc.challenge_id
    WHERE mcc.couple_space_id = ls.couple_space_id
);
