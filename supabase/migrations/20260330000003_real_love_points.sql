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
