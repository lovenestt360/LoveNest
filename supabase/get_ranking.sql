-- Apagar versão antiga
DROP FUNCTION IF EXISTS public.get_ranking(TEXT);

-- Criar versão limpa (só casais ativos)
CREATE FUNCTION public.get_ranking(p_type TEXT DEFAULT 'streak')
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 🔥 RANKING POR STREAK
  IF p_type = 'streak' THEN
    RETURN (
      SELECT json_agg(row_to_json(r))
      FROM (
        SELECT
          ROW_NUMBER() OVER (
            ORDER BY 
              s.current_streak DESC,
              s.last_active_date DESC
          )::INT AS rank,

          cs.id AS couple_space_id,
          cs.house_name AS house_name,
          cs.house_image AS house_image,
          COALESCE(cs.is_verified, false) AS is_verified,

          s.current_streak,
          COALESCE(p.total_points, 0) AS total_points

        FROM public.couple_spaces cs
        JOIN public.streaks s ON s.couple_id = cs.id
        LEFT JOIN public.points p ON p.couple_space_id = cs.id

        -- 🔥 FILTRO CRÍTICO (remove casais inativos)
        WHERE s.current_streak > 0

        ORDER BY 
          s.current_streak DESC,
          s.last_active_date DESC

        LIMIT 20
      ) r
    );
  END IF;

  -- 💰 RANKING POR PONTOS (também limpo)
  RETURN (
    SELECT json_agg(row_to_json(r))
    FROM (
      SELECT
        ROW_NUMBER() OVER (
          ORDER BY 
            p.total_points DESC,
            s.last_active_date DESC
        )::INT AS rank,

        cs.id AS couple_space_id,
        cs.house_name AS house_name,
        cs.house_image AS house_image,
        COALESCE(cs.is_verified, false) AS is_verified,

        COALESCE(s.current_streak, 0) AS current_streak,
        p.total_points

      FROM public.couple_spaces cs
      JOIN public.points p ON p.couple_space_id = cs.id
      LEFT JOIN public.streaks s ON s.couple_id = cs.id

      -- 🔥 FILTRO (só quem tem pontos)
      WHERE p.total_points > 0

      ORDER BY 
        p.total_points DESC,
        s.last_active_date DESC

      LIMIT 20
    ) r
  );
END;
$$;
