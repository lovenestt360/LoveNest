-- 1. LOVE SHIELDS TABLE (NEW SOURCE OF TRUTH)
CREATE TABLE IF NOT EXISTS public.love_shields (
    couple_id UUID PRIMARY KEY REFERENCES public.couple_spaces(id) ON DELETE CASCADE,
    shields INTEGER DEFAULT 1 NOT NULL, -- Couples start with 1
    last_shield_used_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    CONSTRAINT max_shields CHECK (shields <= 5)
);

-- Enable RLS for love_shields
ALTER TABLE public.love_shields ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view their own love_shields"
    ON public.love_shields FOR SELECT
    USING (
        couple_id IN (
            SELECT couple_space_id FROM public.members WHERE user_id = auth.uid()
        )
    );

-- 2. FUNCTION TO PROCESS SHIELD REWARDS (PROGRESSIVE MILESTONES)
CREATE OR REPLACE FUNCTION public.fn_process_shield_rewards(p_couple_id UUID, p_new_streak INTEGER)
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
        INSERT INTO public.love_shields (couple_id, shields)
        VALUES (p_couple_id, LEAST(1 + v_bonus_shields, 5)) -- Handles initial + bonus
        ON CONFLICT (couple_id) 
        DO UPDATE SET 
            shields = LEAST(public.love_shields.shields + v_bonus_shields, 5),
            updated_at = now();
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. UPDATED STREAK ENGINE FUNCTION (WITH SHIELD PROTECTION)
CREATE OR REPLACE FUNCTION public.fn_check_streak(p_couple_id UUID)
RETURNS VOID AS $$
DECLARE
    v_is_active_today BOOLEAN;
    v_last_active DATE;
    v_current_streak INTEGER;
    v_today DATE := CURRENT_DATE;
    v_shields INTEGER;
BEGIN
    -- 1. Check if both partners are active today using our interaction helper
    SELECT public.checkDailyInteraction(p_couple_id) INTO v_is_active_today;

    -- 2. Get current streak data
    SELECT last_active_date, current_streak 
    INTO v_last_active, v_current_streak
    FROM public.love_streak
    WHERE couple_id = p_couple_id;

    -- 3. If no streak record exists, create one
    IF NOT FOUND THEN
        INSERT INTO public.love_streak (couple_id, current_streak, last_active_date)
        VALUES (p_couple_id, 0, NULL);
        
        -- Also ensure shields record exists with initial 1
        INSERT INTO public.love_shields (couple_id, shields)
        VALUES (p_couple_id, 1) ON CONFLICT DO NOTHING;
        
        v_last_active := NULL;
        v_current_streak := 0;
    END IF;

    -- 4. Logic: SHIELD PROTECTION (Check if they missed YESTERDAY)
    -- If they are interacting today, but the streak was broken yesterday (last active was 2+ days ago)
    IF v_is_active_today = TRUE AND v_last_active IS NOT NULL AND v_last_active < (v_today - INTERVAL '1 day')::DATE THEN
        
        -- Check for available shields
        SELECT shields INTO v_shields FROM public.love_shields WHERE couple_id = p_couple_id;
        
        IF v_shields > 0 THEN
            -- CONSUME SHIELD
            UPDATE public.love_shields 
            SET shields = shields - 1, 
                last_shield_used_at = now(),
                updated_at = now()
            WHERE couple_id = p_couple_id;
            
            -- FIX STREAK: Set last_active to YESTERDAY so the current interaction continues it
            v_last_active := (v_today - INTERVAL '1 day')::DATE;
            
            UPDATE public.love_streak 
            SET last_active_date = v_last_active
            WHERE couple_id = p_couple_id;
            
            -- Optional: Log point deduction or notification here if needed
        END IF;
    END IF;

    -- 5. Logic: STREAK INCREMENT
    IF v_is_active_today = TRUE AND (v_last_active IS NULL OR v_last_active < v_today) THEN
        
        -- If it's a continuation (last active was yesterday - either real or protected by shield)
        IF v_last_active = (v_today - INTERVAL '1 day')::DATE THEN
            v_current_streak := v_current_streak + 1;
            
            UPDATE public.love_streak 
            SET current_streak = v_current_streak,
                last_active_date = v_today,
                updated_at = now()
            WHERE couple_id = p_couple_id;
            
            -- Check for rewards
            PERFORM public.fn_process_shield_rewards(p_couple_id, v_current_streak);
            
        ELSE
            -- Start new streak (last active was NULL or too long ago and no shields)
            UPDATE public.love_streak 
            SET current_streak = 1,
                last_active_date = v_today,
                updated_at = now()
            WHERE couple_id = p_couple_id;
        END IF;

    END IF;
    
    -- 6. Logic: STREAK BREAK (Absolute Reset if no protection was possible)
    IF v_last_active IS NOT NULL AND v_last_active < (v_today - INTERVAL '1 day')::DATE THEN
        UPDATE public.love_streak 
        SET current_streak = 0
        WHERE couple_id = p_couple_id AND last_active_date < (v_today - INTERVAL '1 day')::DATE;
    END IF;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. RE-NOTIFY POSTGREST
NOTIFY pgrst, 'reload schema';
