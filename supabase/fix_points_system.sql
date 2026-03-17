-- 1. Add total_points column to love_streaks
ALTER TABLE public.love_streaks ADD COLUMN IF NOT EXISTS total_points INTEGER DEFAULT 0;

-- 2. Create function to update total_points
CREATE OR REPLACE FUNCTION public.handle_micro_challenge_completion()
RETURNS TRIGGER AS $$
DECLARE
    points_to_add INTEGER;
BEGIN
    -- Get points from micro_challenges
    SELECT points INTO points_to_add 
    FROM public.micro_challenges 
    WHERE id = NEW.challenge_id;

    -- Update total_points in love_streaks
    UPDATE public.love_streaks 
    SET total_points = total_points + COALESCE(points_to_add, 0),
        updated_at = now()
    WHERE couple_space_id = NEW.couple_space_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create trigger
DROP TRIGGER IF EXISTS on_micro_challenge_completion ON public.micro_challenge_completions;
CREATE TRIGGER on_micro_challenge_completion
AFTER INSERT ON public.micro_challenge_completions
FOR EACH ROW EXECUTE FUNCTION public.handle_micro_challenge_completion();

-- 4. (Optional) Initialize points for existing completions
-- This might be slow if there are many, but for a new app it's fine
UPDATE public.love_streaks ls
SET total_points = (
    SELECT COALESCE(SUM(mc.points), 0)
    FROM public.micro_challenge_completions mcc
    JOIN public.micro_challenges mc ON mc.id = mcc.challenge_id
    WHERE mcc.couple_space_id = ls.couple_space_id
);
