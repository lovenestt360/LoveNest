-- 1. Create a secure function to fetch global rankings bypassing RLS
CREATE OR REPLACE FUNCTION public.fn_get_global_ranking(p_rank_type TEXT)
RETURNS TABLE (
    couple_space_id UUID,
    current_streak INTEGER,
    total_points BIGINT,
    house_name TEXT,
    house_image TEXT,
    is_verified BOOLEAN
) AS $$
BEGIN
    IF p_rank_type = 'total_points' THEN
        RETURN QUERY
        SELECT 
            ls.couple_space_id,
            ls.current_streak,
            ls.total_points,
            cs.house_name,
            cs.house_image,
            cs.is_verified
        FROM public.love_streaks ls
        JOIN public.couple_spaces cs ON ls.couple_space_id = cs.id
        ORDER BY ls.total_points DESC NULLS LAST, ls.current_streak DESC
        LIMIT 50;
    ELSE
        RETURN QUERY
        SELECT 
            ls.couple_space_id,
            ls.current_streak,
            ls.total_points,
            cs.house_name,
            cs.house_image,
            cs.is_verified
        FROM public.love_streaks ls
        JOIN public.couple_spaces cs ON ls.couple_space_id = cs.id
        ORDER BY ls.current_streak DESC NULLS LAST, ls.total_points DESC
        LIMIT 50;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
