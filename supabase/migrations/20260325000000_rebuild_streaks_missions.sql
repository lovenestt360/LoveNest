-- Rebuild LoveStreak and Missions system

-- 1. DAILY ACTIVITY SYSTEM
CREATE TABLE IF NOT EXISTS public.daily_activity (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    couple_id UUID REFERENCES public.couple_spaces(id) ON DELETE CASCADE NOT NULL,
    date DATE DEFAULT CURRENT_DATE NOT NULL,
    did_action BOOLEAN DEFAULT FALSE NOT NULL,
    UNIQUE(user_id, date)
);

-- Enable RLS for daily_activity
ALTER TABLE public.daily_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own activity"
    ON public.daily_activity FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can view their partner's activity"
    ON public.daily_activity FOR SELECT
    USING (
        couple_id IN (
            SELECT couple_space_id FROM public.members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert/update their own activity"
    ON public.daily_activity FOR ALL
    USING (auth.uid() = user_id);

-- 2. USER ITEMS (SHIELDS)
CREATE TABLE IF NOT EXISTS public.user_items (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    loveshield_count INTEGER DEFAULT 0 NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS for user_items
ALTER TABLE public.user_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own items"
    ON public.user_items FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own items"
    ON public.user_items FOR UPDATE
    USING (auth.uid() = user_id);

-- 3. MISSIONS SYSTEM (REBUILD)
-- We'll modify the existing love_missions if it exists, otherwise create it
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'love_missions') THEN
        CREATE TABLE public.love_missions (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            title TEXT NOT NULL,
            description TEXT NOT NULL,
            reward_points INTEGER DEFAULT 10 NOT NULL,
            created_at TIMESTAMPTZ DEFAULT now()
        );
    ELSE
        -- Ensure reward_points exists
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='love_missions' AND column_name='reward_points') THEN
            ALTER TABLE public.love_missions ADD COLUMN reward_points INTEGER DEFAULT 10 NOT NULL;
        END IF;
    END IF;
END $$;

-- Mission progress table
CREATE TABLE IF NOT EXISTS public.mission_completions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    mission_id UUID REFERENCES public.love_missions(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    couple_space_id UUID REFERENCES public.couple_spaces(id) ON DELETE CASCADE NOT NULL,
    completed_at DATE DEFAULT CURRENT_DATE NOT NULL,
    UNIQUE(user_id, mission_id, completed_at)
);

-- 4. STREAK LOGIC HELPER FUNCTIONS

-- Function to complete an action and update streak if applicable
CREATE OR REPLACE FUNCTION public.fn_confirm_daily_action(p_couple_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_partner_id UUID;
    v_partner_active BOOLEAN;
    v_last_streak_date DATE;
    v_current_streak INTEGER;
    v_today DATE := CURRENT_DATE;
BEGIN
    -- 1. Mark current user activity
    INSERT INTO public.daily_activity (user_id, couple_id, date, did_action)
    VALUES (v_user_id, p_couple_id, v_today, TRUE)
    ON CONFLICT (user_id, date) 
    DO UPDATE SET did_action = TRUE;

    -- 2. Get partner ID
    SELECT user_id INTO v_partner_id 
    FROM public.members 
    WHERE couple_space_id = p_couple_id AND user_id != v_user_id 
    LIMIT 1;

    -- 3. Check if partner is active today
    SELECT did_action INTO v_partner_active 
    FROM public.daily_activity 
    WHERE user_id = v_partner_id AND date = v_today;

    -- 4. Get current streak info
    SELECT last_streak_date, current_streak INTO v_last_streak_date, v_current_streak
    FROM public.love_streaks
    WHERE couple_space_id = p_couple_id;

    -- 5. Logic to update streak
    -- If both are active today and we haven't updated the streak for today yet
    IF v_partner_active = TRUE AND (v_last_streak_date IS NULL OR v_last_streak_date < v_today) THEN
        -- Check if it's a continuation (last_streak_date was yesterday) or a new start
        IF v_last_streak_date = (v_today - INTERVAL '1 day')::DATE THEN
            UPDATE public.love_streaks 
            SET current_streak = current_streak + 1,
                last_streak_date = v_today,
                updated_at = now()
            WHERE couple_space_id = p_couple_id;
        ELSE
            UPDATE public.love_streaks 
            SET current_streak = 1,
                last_streak_date = v_today,
                updated_at = now()
            WHERE couple_space_id = p_couple_id;
        END IF;
    END IF;

    -- 6. Check for break (if someone visits but yesterday was missed)
    -- This part is optional if we prefer to break only at the end of the day or on next success
    -- But let's keep it simple: if last_streak_date is before yesterday, and today is not yet a success, 
    -- the UI can show 0. Or we can explicitly reset it here.
    IF v_last_streak_date < (v_today - INTERVAL '1 day')::DATE AND v_last_streak_date IS NOT NULL THEN
         UPDATE public.love_streaks 
         SET current_streak = 0
         WHERE couple_space_id = p_couple_id AND last_streak_date < (v_today - INTERVAL '1 day')::DATE;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'partner_active', COALESCE(v_partner_active, false),
        'today', v_today
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to purchase shield
CREATE OR REPLACE FUNCTION public.fn_purchase_loveshield(p_cost INTEGER)
RETURNS VOID AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_current_points INTEGER;
BEGIN
    -- Get current points from love_streaks (assuming it exists and has total_points)
    SELECT total_points INTO v_current_points 
    FROM public.love_streaks 
    WHERE couple_space_id = (SELECT couple_space_id FROM public.members WHERE user_id = v_user_id LIMIT 1);

    IF v_current_points < p_cost THEN
        RAISE EXCEPTION 'Pontos insuficientes para comprar LoveShield';
    END IF;

    -- Update points
    UPDATE public.love_streaks 
    SET total_points = total_points - p_cost
    WHERE couple_space_id = (SELECT couple_space_id FROM public.members WHERE user_id = v_user_id LIMIT 1);

    -- Add shield
    INSERT INTO public.user_items (user_id, loveshield_count)
    VALUES (v_user_id, 1)
    ON CONFLICT (user_id) 
    DO UPDATE SET loveshield_count = user_items.loveshield_count + 1, updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to use shield and restore streak
CREATE OR REPLACE FUNCTION public.fn_use_loveshield()
RETURNS VOID AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_couple_id UUID;
    v_shield_count INTEGER;
BEGIN
    SELECT couple_space_id INTO v_couple_id 
    FROM public.members 
    WHERE user_id = v_user_id LIMIT 1;

    SELECT loveshield_count INTO v_shield_count 
    FROM public.user_items 
    WHERE user_id = v_user_id;

    IF v_shield_count < 1 THEN
        RAISE EXCEPTION 'Você não possui LoveShields';
    END IF;

    -- Deduct shield
    UPDATE public.user_items 
    SET loveshield_count = loveshield_count - 1 
    WHERE user_id = v_user_id;

    -- For simplicity, using a shield marks the OTHER user as active if they failed
    -- This "restores" the streak condition for the day
    INSERT INTO public.daily_activity (user_id, couple_id, date, did_action)
    SELECT u.user_id, v_couple_id, CURRENT_DATE, TRUE
    FROM public.members u
    WHERE u.couple_space_id = v_couple_id
    ON CONFLICT (user_id, date) DO UPDATE SET did_action = TRUE;
    
    -- Also ensure current_streak is not 0 if it was broken today
    -- (Implementation detail: rollover logic will check this)
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
