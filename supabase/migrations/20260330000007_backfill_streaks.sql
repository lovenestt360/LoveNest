-- Backfill love_streaks para todos os casais existentes
INSERT INTO public.love_streaks (couple_space_id, current_streak, total_points, last_active_date)
SELECT 
    cs.id, 
    0, 
    COALESCE((SELECT SUM(points) FROM public.love_points lp WHERE lp.couple_space_id = cs.id), 0),
    NULL
FROM public.couple_spaces cs
ON CONFLICT (couple_space_id) 
DO UPDATE SET 
    total_points = COALESCE((SELECT SUM(points) FROM public.love_points lp WHERE lp.couple_space_id = EXCLUDED.couple_space_id), public.love_streaks.total_points);
