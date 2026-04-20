-- ══════════════════════════════════════════════════════════════════════
-- get_ranking(p_type TEXT)
-- Função chamada pelo RankingCard para carregar o ranking inicial.
-- p_type: 'streak' | 'points'
-- Retorna array JSON ordenado com Top 20 casais.
-- ══════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.get_ranking(p_type TEXT DEFAULT 'streak')
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN

  -- ──────────────────────────────────────────────────────────────────────
  -- RANKING POR STREAK
  -- ──────────────────────────────────────────────────────────────────────
  IF p_type = 'streak' THEN
    RETURN (
      SELECT json_agg(row_to_json(r))
      FROM (
        SELECT
          ROW_NUMBER() OVER (
            ORDER BY COALESCE(s.current_streak, 0) DESC,
                     s.last_active_date DESC NULLS LAST
          )::INT                          AS rank,
          cs.id                           AS couple_space_id,
          COALESCE(cs.name, 'Casal Mistério') AS house_name,
          cs.image_url                    AS house_image,
          COALESCE(cs.is_verified, false) AS is_verified,
          COALESCE(s.current_streak, 0)   AS current_streak,
          COALESCE(p.total_points, 0)     AS total_points
        FROM public.couple_spaces cs
        LEFT JOIN public.streaks s ON s.couple_id = cs.id
        LEFT JOIN public.points  p ON p.couple_space_id = cs.id
        ORDER BY COALESCE(s.current_streak, 0) DESC,
                 s.last_active_date DESC NULLS LAST
        LIMIT 20
      ) r
    );
  END IF;

  -- ──────────────────────────────────────────────────────────────────────
  -- RANKING POR PONTOS
  -- ──────────────────────────────────────────────────────────────────────
  RETURN (
    SELECT json_agg(row_to_json(r))
    FROM (
      SELECT
        ROW_NUMBER() OVER (
          ORDER BY COALESCE(p.total_points, 0) DESC,
                   s.last_active_date DESC NULLS LAST
        )::INT                          AS rank,
        cs.id                           AS couple_space_id,
        COALESCE(cs.name, 'Casal Mistério') AS house_name,
        cs.image_url                    AS house_image,
        COALESCE(cs.is_verified, false) AS is_verified,
        COALESCE(s.current_streak, 0)   AS current_streak,
        COALESCE(p.total_points, 0)     AS total_points
      FROM public.couple_spaces cs
      LEFT JOIN public.points  p ON p.couple_space_id = cs.id
      LEFT JOIN public.streaks s ON s.couple_id = cs.id
      ORDER BY COALESCE(p.total_points, 0) DESC,
               s.last_active_date DESC NULLS LAST
      LIMIT 20
    ) r
  );

END;
$$;
