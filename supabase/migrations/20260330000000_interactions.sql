-- 1. INTERACTIONS TABLE
CREATE TABLE IF NOT EXISTS public.interactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    couple_id UUID REFERENCES public.couple_spaces(id) ON DELETE CASCADE NOT NULL,
    type TEXT NOT NULL, -- 'message_sent', 'task_completed', 'mood_logged', 'plan_completed'
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable RLS for interactions
ALTER TABLE public.interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own interactions"
    ON public.interactions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own and partner interactions"
    ON public.interactions FOR SELECT
    USING (
        couple_id IN (
            SELECT couple_space_id FROM public.members WHERE user_id = auth.uid()
        )
    );

-- 2. STREAK VALIDATION FUNCTION
-- Returns TRUE if both users in the couple have at least one interaction today
CREATE OR REPLACE FUNCTION public.checkDailyInteraction(p_couple_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_user1_id UUID;
    v_user2_id UUID;
    v_user1_active BOOLEAN;
    v_user2_active BOOLEAN;
    v_today DATE := CURRENT_DATE;
BEGIN
    -- Get both user IDs for the couple
    SELECT user_id INTO v_user1_id FROM public.members WHERE couple_space_id = p_couple_id ORDER BY joined_at LIMIT 1;
    SELECT user_id INTO v_user2_id FROM public.members WHERE couple_space_id = p_couple_id ORDER BY joined_at OFFSET 1 LIMIT 1;

    -- Check if user 1 has any interaction today
    SELECT EXISTS (
        SELECT 1 FROM public.interactions 
        WHERE user_id = v_user1_id AND created_at::DATE = v_today
    ) INTO v_user1_active;

    -- Check if user 2 has any interaction today
    SELECT EXISTS (
        SELECT 1 FROM public.interactions 
        WHERE user_id = v_user2_id AND created_at::DATE = v_today
    ) INTO v_user2_active;

    RETURN v_user1_active AND v_user2_active;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
