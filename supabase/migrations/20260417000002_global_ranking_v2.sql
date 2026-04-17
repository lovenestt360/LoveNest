-- ══════════════════════════════════════════════════════════════════════
-- RANKING GLOBAL V2 — Usa tabelas do LoveStreak V3
-- Tabelas: streaks (couple_id, current_streak, longest_streak)
--          points  (couple_id, total_points)
--          couple_spaces (id, house_name, house_image, is_verified)
-- ══════════════════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS public.fn_get_global_ranking(TEXT);

CREATE OR REPLACE FUNCTION public.fn_get_global_ranking(p_rank_type TEXT DEFAULT 'streak')
RETURNS TABLE (
  rank            BIGINT,
  couple_space_id UUID,
  house_name      TEXT,
  house_image     TEXT,
  is_verified     BOOLEAN,
  current_streak  INT,
  longest_streak  INT,
  total_points    INT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF p_rank_type = 'points' THEN
    RETURN QUERY
    SELECT
      ROW_NUMBER() OVER (ORDER BY COALESCE(p.total_points, 0) DESC, COALESCE(s.current_streak, 0) DESC) AS rank,
      cs.id                          AS couple_space_id,
      COALESCE(cs.house_name, '???') AS house_name,
      cs.house_image,
      COALESCE(cs.is_verified, false) AS is_verified,
      COALESCE(s.current_streak, 0)  AS current_streak,
      COALESCE(s.longest_streak, 0)  AS longest_streak,
      COALESCE(p.total_points, 0)    AS total_points
    FROM public.couple_spaces cs
    LEFT JOIN public.streaks s ON s.couple_id = cs.id
    LEFT JOIN public.points  p ON p.couple_id = cs.id
    WHERE COALESCE(p.total_points, 0) > 0
       OR COALESCE(s.current_streak, 0) > 0
    ORDER BY COALESCE(p.total_points, 0) DESC, COALESCE(s.current_streak, 0) DESC
    LIMIT 50;
  ELSE
    -- Default: ordenar por streak
    RETURN QUERY
    SELECT
      ROW_NUMBER() OVER (ORDER BY COALESCE(s.current_streak, 0) DESC, COALESCE(p.total_points, 0) DESC) AS rank,
      cs.id                          AS couple_space_id,
      COALESCE(cs.house_name, '???') AS house_name,
      cs.house_image,
      COALESCE(cs.is_verified, false) AS is_verified,
      COALESCE(s.current_streak, 0)  AS current_streak,
      COALESCE(s.longest_streak, 0)  AS longest_streak,
      COALESCE(p.total_points, 0)    AS total_points
    FROM public.couple_spaces cs
    LEFT JOIN public.streaks s ON s.couple_id = cs.id
    LEFT JOIN public.points  p ON p.couple_id = cs.id
    WHERE COALESCE(s.current_streak, 0) > 0
       OR COALESCE(p.total_points, 0) > 0
    ORDER BY COALESCE(s.current_streak, 0) DESC, COALESCE(p.total_points, 0) DESC
    LIMIT 50;
  END IF;
END;
$$;

-- Garantir acesso público (função já é SECURITY DEFINER)
GRANT EXECUTE ON FUNCTION public.fn_get_global_ranking(TEXT) TO authenticated, anon;

NOTIFY pgrst, 'reload schema';

SELECT 'fn_get_global_ranking V2 criada ✓' AS resultado;
