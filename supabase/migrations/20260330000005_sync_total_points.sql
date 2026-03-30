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
