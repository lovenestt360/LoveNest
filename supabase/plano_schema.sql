-- Create Plano Items table
CREATE TABLE IF NOT EXISTS public.plano_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    couple_space_id UUID REFERENCES public.couple_spaces(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id),
    title TEXT NOT NULL,
    plan_at TIMESTAMPTZ, -- Optional time
    completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.plano_items ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their couple's plans"
    ON public.plano_items FOR SELECT
    USING (
      couple_space_id IN (
        SELECT couple_space_id FROM public.members WHERE user_id = auth.uid()
      )
    );

CREATE POLICY "Users can insert plans for their couple"
    ON public.plano_items FOR INSERT
    WITH CHECK (
      couple_space_id IN (
        SELECT couple_space_id FROM public.members WHERE user_id = auth.uid()
      )
    );

CREATE POLICY "Users can update their couple's plans"
    ON public.plano_items FOR UPDATE
    USING (
      couple_space_id IN (
        SELECT couple_space_id FROM public.members WHERE user_id = auth.uid()
      )
    );

CREATE POLICY "Users can delete their couple's plans"
    ON public.plano_items FOR DELETE
    USING (
      couple_space_id IN (
        SELECT couple_space_id FROM public.members WHERE user_id = auth.uid()
      )
    );

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.plano_items;

-- Trigger for Love Engine Automation (v4)
DROP TRIGGER IF EXISTS tr_streak_plano_v4 ON public.plano_items;
CREATE TRIGGER tr_streak_plano_v4 AFTER INSERT OR UPDATE OF completed ON public.plano_items 
FOR EACH ROW WHEN (NEW.completed = true AND (OLD.completed IS NULL OR OLD.completed = false))
EXECUTE FUNCTION public.update_streak_interaction_v4();
