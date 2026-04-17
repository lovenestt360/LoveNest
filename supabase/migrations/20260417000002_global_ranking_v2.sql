DROP FUNCTION IF EXISTS public.fn_get_global_ranking(TEXT);

CREATE OR REPLACE FUNCTION public.fn_get_global_ranking(p_rank_type TEXT DEFAULT 'streak')
RETURNS TABLE (
  rank            BIGINT,
  couple_space_id UUID,
  house_name      TEXT,
  house_image     TEXT,
  is_verified     BOOLEAN,
  current_streak  INT,
  total_points    BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN

  IF p_rank_type = 'points' THEN
    RETURN QUERY
    SELECT
      ROW_NUMBER() OVER (
        ORDER BY COALESCE(p.total_points, 0) DESC,
                 COALESCE(s.current_streak, 0) DESC
      ) AS rank,

      cs.id AS couple_space_id,
      COALESCE(cs.house_name, 'Sem nome') AS house_name,
      cs.house_image,
      COALESCE(cs.is_verified, false),

      COALESCE(s.current_streak, 0),
      COALESCE(p.total_points, 0)

    FROM public.couple_spaces cs
    LEFT JOIN public.streaks s 
      ON s.couple_space_id = cs.id
    LEFT JOIN public.love_points p 
      ON p.couple_space_id = cs.id

    ORDER BY COALESCE(p.total_points, 0) DESC
    LIMIT 50;

  ELSE
    -- ranking por streak
    RETURN QUERY
    SELECT
      ROW_NUMBER() OVER (
        ORDER BY COALESCE(s.current_streak, 0) DESC,
                 COALESCE(p.total_points, 0) DESC
      ) AS rank,

      cs.id AS couple_space_id,
      COALESCE(cs.house_name, 'Sem nome') AS house_name,
      cs.house_image,
      COALESCE(cs.is_verified, false),

      COALESCE(s.current_streak, 0),
      COALESCE(p.total_points, 0)

    FROM public.couple_spaces cs
    LEFT JOIN public.streaks s 
      ON s.couple_space_id = cs.id
    LEFT JOIN public.love_points p 
      ON p.couple_space_id = cs.id

    ORDER BY COALESCE(s.current_streak, 0) DESC
    LIMIT 50;

  END IF;

END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_get_global_ranking(TEXT) 
TO authenticated, anon;

NOTIFY pgrst, 'reload schema';
