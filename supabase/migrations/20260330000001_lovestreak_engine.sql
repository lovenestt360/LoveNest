-- 1. LOVE STREAK TABLE (SINGULAR - NEW SOURCE OF TRUTH)
CREATE TABLE IF NOT EXISTS public.love_streak (
    couple_id UUID PRIMARY KEY REFERENCES public.couple_spaces(id) ON DELETE CASCADE,
    current_streak INTEGER DEFAULT 0 NOT NULL,
    last_active_date DATE,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable RLS for love_streak
ALTER TABLE public.love_streak ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view their own love_streak"
    ON public.love_streak FOR SELECT
    USING (
        couple_id IN (
            SELECT couple_space_id FROM public.members WHERE user_id = auth.uid()
        )
    );

-- 2. STREAK ENGINE FUNCTION
-- This function calculates if a streak should be incremented based on today's interactions
CREATE OR REPLACE FUNCTION public.fn_check_streak(p_couple_id UUID)
RETURNS VOID AS $$
DECLARE
    v_is_active_today BOOLEAN;
    v_last_active DATE;
    v_current_streak INTEGER;
    v_today DATE := CURRENT_DATE;
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
        v_last_active := NULL;
        v_current_streak := 0;
    END IF;

    -- 4. Logic: If both are active today AND we haven't updated for today yet
    IF v_is_active_today = TRUE AND (v_last_active IS NULL OR v_last_active < v_today) THEN
        
        -- If it's a continuation (last active was yesterday)
        IF v_last_active = (v_today - INTERVAL '1 day')::DATE THEN
            UPDATE public.love_streak 
            SET current_streak = current_streak + 1,
                last_active_date = v_today,
                updated_at = now()
            WHERE couple_id = p_couple_id;
        ELSE
            -- Start new streak
            UPDATE public.love_streak 
            SET current_streak = 1,
                last_active_date = v_today,
                updated_at = now()
            WHERE couple_id = p_couple_id;
        END IF;

    END IF;
    
    -- 5. Logic: Check for streak break (Optimization)
    -- If last_active was before yesterday, the streak is technically 0 now
    -- We'll handle this purely in the retrieval logic OR reset it here if we want absolute truth
    IF v_last_active IS NOT NULL AND v_last_active < (v_today - INTERVAL '1 day')::DATE THEN
        UPDATE public.love_streak 
        SET current_streak = 0
        WHERE couple_id = p_couple_id AND last_active_date < (v_today - INTERVAL '1 day')::DATE;
    END IF;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. TRIGGER TO AUTO-RUN ENGINE
-- Every time an interaction is recorded, check if it completes a daily streak step
CREATE OR REPLACE FUNCTION public.tr_on_interaction_recorded()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM public.fn_check_streak(NEW.couple_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_interactions_streak_trigger ON public.interactions;
CREATE TRIGGER tr_interactions_streak_trigger
AFTER INSERT ON public.interactions
FOR EACH ROW EXECUTE FUNCTION public.tr_on_interaction_recorded();
