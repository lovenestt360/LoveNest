-- 1. LOVE POINTS TABLES (INDIVIDUAL)
CREATE TABLE IF NOT EXISTS public.love_points (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    couple_space_id UUID REFERENCES public.couple_spaces(id) ON DELETE CASCADE,
    points BIGINT DEFAULT 0 NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    UNIQUE(user_id, couple_space_id)
);

CREATE TABLE IF NOT EXISTS public.love_points_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    couple_space_id UUID REFERENCES public.couple_spaces(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    reason TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.love_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.love_points_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own points"
    ON public.love_points FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can view their own point history"
    ON public.love_points_history FOR SELECT
    USING (user_id = auth.uid());

-- 2. AWARD POINTS ATOMIC FUNCTION
CREATE OR REPLACE FUNCTION public.fn_award_points(
    p_user_id UUID, 
    p_couple_space_id UUID, 
    p_amount INTEGER, 
    p_reason TEXT
)
RETURNS VOID AS $$
BEGIN
    -- Upsert points
    INSERT INTO public.love_points (user_id, couple_space_id, points, updated_at)
    VALUES (p_user_id, p_couple_space_id, p_amount, now())
    ON CONFLICT (user_id, couple_space_id) 
    DO UPDATE SET 
        points = public.love_points.points + EXCLUDED.points,
        updated_at = now();

    -- Log history
    INSERT INTO public.love_points_history (user_id, couple_space_id, amount, reason)
    VALUES (p_user_id, p_couple_space_id, p_amount, p_reason);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. TRIGGER: ON MISSION COMPLETED
CREATE OR REPLACE FUNCTION public.tr_fn_on_mission_completion_award()
RETURNS TRIGGER AS $$
DECLARE
    v_reward INTEGER;
BEGIN
    -- Fetch reward from the mission template
    SELECT reward_points INTO v_reward FROM public.love_missions WHERE id = NEW.mission_id;
    
    -- Award points
    PERFORM public.fn_award_points(NEW.user_id, NEW.couple_space_id, COALESCE(v_reward, 10), 'mission_completed');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_mission_completion_points_trigger ON public.mission_completions;
CREATE TRIGGER tr_mission_completion_points_trigger
AFTER INSERT ON public.mission_completions
FOR EACH ROW EXECUTE FUNCTION public.tr_fn_on_mission_completion_award();

-- 4. TRIGGER: ON STREAK INCREMENT
CREATE OR REPLACE FUNCTION public.tr_fn_on_streak_increment_award()
RETURNS TRIGGER AS $$
DECLARE
    v_member RECORD;
BEGIN
    -- Only trigger if the streak actually increased
    IF NEW.current_streak > OLD.current_streak THEN
        -- Find both partners in the couple
        FOR v_member IN 
            SELECT user_id FROM public.members WHERE couple_space_id = NEW.couple_space_id
        LOOP
            -- Award 50 points to each for maintaining the connection
            PERFORM public.fn_award_points(v_member.user_id, NEW.couple_space_id, 50, 'streak_maintained');
        END LOOP;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_streak_increment_points_trigger ON public.love_streaks;
CREATE TRIGGER tr_streak_increment_points_trigger
AFTER UPDATE ON public.love_streaks
FOR EACH ROW EXECUTE FUNCTION public.tr_fn_on_streak_increment_award();

-- 5. INITIAL MIGRATION (Optional: Move shared points to individual records if any exist)
-- This assumes some shared points might be in a 'total_points' column of 'love_streaks'
DO $$
DECLARE
    v_streak RECORD;
    v_member RECORD;
BEGIN
    -- Assuming 'love_streaks' might have a 'total_points' column we can migrate from
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='love_streaks' AND column_name='total_points') THEN
        FOR v_streak IN SELECT couple_space_id, total_points FROM public.love_streaks WHERE total_points > 0 LOOP
            FOR v_member IN SELECT user_id FROM public.members WHERE couple_space_id = v_streak.couple_space_id LOOP
                PERFORM public.fn_award_points(v_member.user_id, v_streak.couple_space_id, v_streak.total_points, 'shared_points_migration');
            END LOOP;
        END LOOP;
    END IF;
END $$;
-- 1. LOVE SHIELDS TABLE (NEW SOURCE OF TRUTH)
CREATE TABLE IF NOT EXISTS public.love_shields (
    couple_space_id UUID PRIMARY KEY REFERENCES public.couple_spaces(id) ON DELETE CASCADE,
    shields INTEGER DEFAULT 1 NOT NULL, -- Couples start with 1
    last_shield_used_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    CONSTRAINT max_shields CHECK (shields <= 5)
);

-- Enable RLS for love_shields
ALTER TABLE public.love_shields ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view their own love_shields" ON public.love_shields;
CREATE POLICY "Members can view their own love_shields"
    ON public.love_shields FOR SELECT
    USING (
        couple_space_id IN (
            SELECT couple_space_id FROM public.members WHERE user_id = auth.uid()
        )
    );

-- 2. FUNCTION TO PROCESS SHIELD REWARDS (PROGRESSIVE MILESTONES)
CREATE OR REPLACE FUNCTION public.fn_process_shield_rewards(p_couple_space_id UUID, p_new_streak INTEGER)
RETURNS VOID AS $$
DECLARE
    v_bonus_shields INTEGER := 0;
BEGIN
    -- Determine bonus based on milestones
    IF p_new_streak = 3 THEN v_bonus_shields := 1;
    ELSIF p_new_streak = 7 THEN v_bonus_shields := 1;
    ELSIF p_new_streak = 14 THEN v_bonus_shields := 2;
    ELSIF p_new_streak = 30 THEN v_bonus_shields := 3;
    END IF;

    -- Award shields if milestone reached, respecting max = 5
    IF v_bonus_shields > 0 THEN
        INSERT INTO public.love_shields (couple_space_id, shields)
        VALUES (p_couple_space_id, LEAST(1 + v_bonus_shields, 5)) -- Handles initial + bonus
        ON CONFLICT (couple_space_id) 
        DO UPDATE SET 
            shields = LEAST(public.love_shields.shields + v_bonus_shields, 5),
            updated_at = now();
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. UPDATED STREAK ENGINE FUNCTION (WITH SHIELD PROTECTION)
CREATE OR REPLACE FUNCTION public.fn_check_streak(p_couple_space_id UUID)
RETURNS VOID AS $$
DECLARE
    v_is_active_today BOOLEAN;
    v_last_active DATE;
    v_current_streak INTEGER;
    v_today DATE := CURRENT_DATE;
    v_shields INTEGER;
BEGIN
    -- 1. Check if both partners are active today using our interaction helper
    SELECT public.checkDailyInteraction(p_couple_space_id) INTO v_is_active_today;

    -- 2. Get current streak data (Standardized to plural: love_streaks)
    SELECT last_active_date, current_streak 
    INTO v_last_active, v_current_streak
    FROM public.love_streaks
    WHERE couple_space_id = p_couple_space_id;

    -- 3. If no streak record exists, create one
    IF NOT FOUND THEN
        INSERT INTO public.love_streaks (couple_space_id, current_streak, last_active_date)
        VALUES (p_couple_space_id, 0, NULL);
        
        -- Also ensure shields record exists with initial 1
        INSERT INTO public.love_shields (couple_space_id, shields)
        VALUES (p_couple_space_id, 1) ON CONFLICT DO NOTHING;
        
        v_last_active := NULL;
        v_current_streak := 0;
    END IF;

    -- 4. Logic: SHIELD PROTECTION (Check if they missed YESTERDAY)
    -- If they are interacting today, but the streak was broken yesterday (last active was 2+ days ago)
    IF v_is_active_today = TRUE AND v_last_active IS NOT NULL AND v_last_active < (v_today - INTERVAL '1 day')::DATE THEN
        
        -- Check for available shields
        SELECT shields INTO v_shields FROM public.love_shields WHERE couple_space_id = p_couple_space_id;
        
        IF v_shields > 0 THEN
            -- CONSUME SHIELD
            UPDATE public.love_shields 
            SET shields = shields - 1, 
                last_shield_used_at = now(),
                updated_at = now()
            WHERE couple_space_id = p_couple_space_id;
            
            -- FIX STREAK: Set last_active to YESTERDAY so the current interaction continues it
            v_last_active := (v_today - INTERVAL '1 day')::DATE;
            
            UPDATE public.love_streaks 
            SET last_active_date = v_last_active
            WHERE couple_space_id = p_couple_space_id;
            
        END IF;
    END IF;

    -- 5. Logic: STREAK INCREMENT
    IF v_is_active_today = TRUE AND (v_last_active IS NULL OR v_last_active < v_today) THEN
        
        -- If it's a continuation (last active was yesterday - either real or protected by shield)
        IF v_last_active = (v_today - INTERVAL '1 day')::DATE THEN
            v_current_streak := v_current_streak + 1;
            
            UPDATE public.love_streaks 
            SET current_streak = v_current_streak,
                last_active_date = v_today,
                updated_at = now()
            WHERE couple_space_id = p_couple_space_id;
            
            -- Check for rewards
            PERFORM public.fn_process_shield_rewards(p_couple_space_id, v_current_streak);
            
        ELSE
            -- Start new streak (last active was NULL or too long ago and no shields)
            UPDATE public.love_streaks 
            SET current_streak = 1,
                last_active_date = v_today,
                updated_at = now()
            WHERE couple_space_id = p_couple_space_id;
        END IF;

    END IF;
    
    -- 6. Logic: STREAK BREAK (Absolute Reset if no protection was possible)
    IF v_last_active IS NOT NULL AND v_last_active < (v_today - INTERVAL '1 day')::DATE THEN
        UPDATE public.love_streaks 
        SET current_streak = 0
        WHERE couple_space_id = p_couple_space_id AND last_active_date < (v_today - INTERVAL '1 day')::DATE;
    END IF;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. FUNCTION TO PURCHASE SHIELD
CREATE OR REPLACE FUNCTION public.fn_purchase_loveshield_v4(p_cost INTEGER)
RETURNS VOID AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_couple_space_id UUID;
    v_points BIGINT;
BEGIN
    -- Get couple id
    SELECT couple_space_id INTO v_couple_space_id FROM public.members WHERE user_id = v_user_id LIMIT 1;
    
    -- Check points
    SELECT points INTO v_points FROM public.love_points WHERE user_id = v_user_id AND couple_space_id = v_couple_space_id;
    
    IF COALESCE(v_points, 0) < p_cost THEN
        RAISE EXCEPTION 'Pontos insuficientes para comprar LoveShield';
    END IF;
    
    -- Deduct points
    PERFORM public.fn_award_points(v_user_id, v_couple_space_id, -p_cost, 'shield_purchase');
    
    -- Award shield to the couple
    INSERT INTO public.love_shields (couple_space_id, shields)
    VALUES (v_couple_space_id, 1)
    ON CONFLICT (couple_space_id) 
    DO UPDATE SET 
        shields = LEAST(public.love_shields.shields + 1, 5),
        updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. FUNCTION TO MANUALLY USE SHIELD (REPAIR STREAK)
CREATE OR REPLACE FUNCTION public.fn_use_loveshield_v4()
RETURNS VOID AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_couple_space_id UUID;
    v_shields INTEGER;
    v_last_active DATE;
    v_today DATE := CURRENT_DATE;
BEGIN
    SELECT couple_space_id INTO v_couple_space_id FROM public.members WHERE user_id = v_user_id LIMIT 1;
    SELECT shields INTO v_shields FROM public.love_shields WHERE couple_space_id = v_couple_space_id;
    
    IF COALESCE(v_shields, 0) < 1 THEN
        RAISE EXCEPTION 'O casal não possui LoveShields';
    END IF;
    
    -- Check if streak is actually broken (last active was before yesterday)
    SELECT last_active_date INTO v_last_active FROM public.love_streaks WHERE couple_space_id = v_couple_space_id;
    
    -- Consume shield
    UPDATE public.love_shields SET shields = shields - 1, updated_at = now(), last_shield_used_at = now() WHERE couple_space_id = v_couple_space_id;
    
    -- Restore streak: Set last_active to YESTERDAY. 
    UPDATE public.love_streaks 
    SET last_active_date = (v_today - INTERVAL '1 day')::DATE,
        updated_at = now()
    WHERE couple_space_id = v_couple_space_id;
    
    -- Recalculate
    PERFORM public.fn_check_streak(v_couple_space_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. ENSURE FEATURE FLAG EXISTS
INSERT INTO public.feature_flags (key, scope, enabled)
SELECT 'home_lovestreak', 'global', true
WHERE NOT EXISTS (
    SELECT 1 FROM public.feature_flags 
    WHERE key = 'home_lovestreak' AND scope = 'global' AND target_id IS NULL
);

-- 5. RE-NOTIFY POSTGREST
NOTIFY pgrst, 'reload schema';
-- 1. ADD TOTAL_POINTS TO LOVE_STREAKS (CACHE FOR RANKING)
ALTER TABLE public.love_streaks ADD COLUMN IF NOT EXISTS total_points BIGINT DEFAULT 0 NOT NULL;

-- 2. TRIGGER FUNCTION TO SYNC TOTAL_POINTS
CREATE OR REPLACE FUNCTION public.fn_sync_couple_total_points()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.love_streaks
    SET total_points = (
        SELECT COALESCE(SUM(points), 0)
        FROM public.love_points
        WHERE couple_space_id = COALESCE(NEW.couple_space_id, OLD.couple_space_id)
    ),
    updated_at = now()
    WHERE couple_space_id = COALESCE(NEW.couple_space_id, OLD.couple_space_id);
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. APPLY TRIGGER TO LOVE_POINTS
DROP TRIGGER IF EXISTS tr_sync_total_points ON public.love_points;
CREATE TRIGGER tr_sync_total_points
AFTER INSERT OR UPDATE OR DELETE ON public.love_points
FOR EACH ROW EXECUTE FUNCTION public.fn_sync_couple_total_points();

-- 4. INITIAL SYNC
UPDATE public.love_streaks ls
SET total_points = (
    SELECT COALESCE(SUM(points), 0)
    FROM public.love_points lp
    WHERE lp.couple_space_id = ls.couple_space_id
);

-- 5. RE-NOTIFY POSTGREST
NOTIFY pgrst, 'reload schema';
