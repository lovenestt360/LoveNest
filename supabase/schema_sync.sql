-- LOVE NEST SCHEMA SYNC & STABILIZATION
-- This script ensures all required tables exist and unifies the interaction logic.

-- 1. PWA Tutorial Settings
CREATE TABLE IF NOT EXISTS public.pwa_tutorial_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    android_video_url TEXT,
    ios_video_url TEXT,
    is_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Love Streaks (Main Table)
CREATE TABLE IF NOT EXISTS public.love_streaks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    couple_space_id uuid NOT NULL REFERENCES public.couple_spaces(id) ON DELETE CASCADE UNIQUE,
    current_streak integer NOT NULL DEFAULT 0,
    best_streak integer NOT NULL DEFAULT 0,
    total_points integer NOT NULL DEFAULT 0,
    last_streak_date date,
    shield_remaining integer NOT NULL DEFAULT 3,
    shield_monthly_reset date NOT NULL DEFAULT date_trunc('month', CURRENT_DATE)::date,
    partner1_interacted_today boolean NOT NULL DEFAULT false,
    partner2_interacted_today boolean NOT NULL DEFAULT false,
    interaction_date date,
    level_title text NOT NULL DEFAULT 'Iniciante',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Ensure total_points column exists if table was created earlier
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='love_streaks' AND column_name='total_points') THEN
        ALTER TABLE public.love_streaks ADD COLUMN total_points integer NOT NULL DEFAULT 0;
    END IF;
END $$;

-- 3. Daily Interactions (Unified Log)
CREATE TABLE IF NOT EXISTS public.daily_interactions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    couple_space_id uuid NOT NULL REFERENCES public.couple_spaces(id) ON DELETE CASCADE,
    user_id uuid NOT NULL,
    day_key date NOT NULL DEFAULT CURRENT_DATE,
    interaction_type text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(couple_space_id, user_id, day_key, interaction_type)
);

-- 4. Unified Interaction Function
CREATE OR REPLACE FUNCTION public.update_streak_interaction()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_couple_space_id uuid;
    v_interaction_type text;
BEGIN
    -- Determine interaction type based on table
    v_interaction_type := TG_TABLE_NAME;

    -- Get couple_space_id from NEW record or from user if not present (depends on table)
    IF v_interaction_type = 'messages' THEN
        v_couple_space_id := NEW.couple_space_id;
    ELSIF v_interaction_type = 'mood_checkins' THEN
        v_couple_space_id := (SELECT couple_space_id FROM public.members WHERE user_id = NEW.user_id LIMIT 1);
    ELSIF v_interaction_type = 'tasks' THEN
        v_couple_space_id := NEW.couple_space_id;
    ELSIF v_interaction_type = 'photos' THEN
        v_couple_space_id := NEW.couple_space_id;
    ELSE
        -- Fallback to auth.uid() query
        SELECT couple_space_id INTO v_couple_space_id 
        FROM public.members 
        WHERE user_id = auth.uid()
        LIMIT 1;
    END IF;

    IF v_couple_space_id IS NULL THEN
        RETURN NEW;
    END IF;

    -- A. Record in daily_interactions (Internal Unified Log)
    INSERT INTO public.daily_interactions (couple_space_id, user_id, interaction_type)
    VALUES (v_couple_space_id, auth.uid(), v_interaction_type)
    ON CONFLICT (couple_space_id, user_id, day_key, interaction_type) DO NOTHING;

    -- B. Update binary interaction flags in love_streaks
    UPDATE public.love_streaks
    SET 
        partner1_interacted_today = CASE 
            WHEN (SELECT user_id FROM public.members WHERE couple_space_id = v_couple_space_id ORDER BY joined_at ASC LIMIT 1) = auth.uid() 
            THEN true 
            ELSE partner1_interacted_today 
        END,
        partner2_interacted_today = CASE 
            WHEN (SELECT user_id FROM public.members WHERE couple_space_id = v_couple_space_id ORDER BY joined_at DESC LIMIT 1) = auth.uid() 
            THEN true 
            ELSE partner2_interacted_today 
        END,
        interaction_date = CURRENT_DATE,
        updated_at = now()
    WHERE couple_space_id = v_couple_space_id;

    RETURN NEW;
END;
$$;

-- 5. Policies
ALTER TABLE public.pwa_tutorial_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated to read pwa settings" ON public.pwa_tutorial_settings;
CREATE POLICY "Allow authenticated to read pwa settings" ON public.pwa_tutorial_settings FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow admins to update pwa settings" ON public.pwa_tutorial_settings;
CREATE POLICY "Allow admins to update pwa settings" ON public.pwa_tutorial_settings FOR ALL TO authenticated 
USING (EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid() OR username = auth.uid()::text));

-- Ensure RLS and Policies for love_streaks and daily_interactions are consistent
ALTER TABLE public.love_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_interactions ENABLE ROW LEVEL SECURITY;

-- Reload schema
NOTIFY pgrst, 'reload schema';
