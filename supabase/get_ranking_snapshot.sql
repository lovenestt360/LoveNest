-- ══════════════════════════════════════════════════════════════════════
-- get_ranking_snapshot(p_couple_id UUID)
-- Retorna o ranking completo + posição do casal que acabou de fazer check-in
-- Usado pelo log_daily_activity para enviar ranking junto com streak na mesma resposta
-- ══════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.get_ranking_snapshot(p_couple_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_streak_ranking  JSONB;
  v_points_ranking  JSONB;
  v_my_streak_pos   INT;
  v_my_points_pos   INT;
BEGIN

  -- ──────────────────────────────────────────────────────────────────────
  -- 1. RANKING POR STREAK (Top 20)
  -- ──────────────────────────────────────────────────────────────────────
  SELECT jsonb_agg(r ORDER BY r->'rank')
  INTO v_streak_ranking
  FROM (
    SELECT jsonb_build_object(
      'rank',           ROW_NUMBER() OVER (ORDER BY COALESCE(s.current_streak,0) DESC, s.last_active_date DESC NULLS LAST),
      'couple_space_id', cs.id,
      'house_name',     cs.house_name,
      'house_image',    cs.house_image,
      'is_verified',    COALESCE(cs.is_verified, false),
      'current_streak', COALESCE(s.current_streak, 0),
      'total_points',   COALESCE(p.total_points, 0)
    ) AS r
    FROM public.couple_spaces cs
    LEFT JOIN public.streaks s ON s.couple_id = cs.id
    LEFT JOIN public.points  p ON p.couple_space_id = cs.id
    ORDER BY COALESCE(s.current_streak,0) DESC, s.last_active_date DESC NULLS LAST
    LIMIT 20
  ) sub;

  -- ──────────────────────────────────────────────────────────────────────
  -- 2. RANKING POR PONTOS (Top 20)
  -- ──────────────────────────────────────────────────────────────────────
  SELECT jsonb_agg(r ORDER BY r->'rank')
  INTO v_points_ranking
  FROM (
    SELECT jsonb_build_object(
      'rank',           ROW_NUMBER() OVER (ORDER BY COALESCE(p.total_points,0) DESC, s.last_active_date DESC NULLS LAST),
      'couple_space_id', cs.id,
      'house_name',     cs.house_name,
      'house_image',    cs.house_image,
      'is_verified',    COALESCE(cs.is_verified, false),
      'current_streak', COALESCE(s.current_streak, 0),
      'total_points',   COALESCE(p.total_points, 0)
    ) AS r
    FROM public.couple_spaces cs
    LEFT JOIN public.points  p ON p.couple_space_id = cs.id
    LEFT JOIN public.streaks s ON s.couple_id = cs.id
    ORDER BY COALESCE(p.total_points,0) DESC, s.last_active_date DESC NULLS LAST
    LIMIT 20
  ) sub;

  -- ──────────────────────────────────────────────────────────────────────
  -- 3. POSIÇÃO DO MEU CASAL (streak e pontos)
  -- ──────────────────────────────────────────────────────────────────────
  SELECT pos INTO v_my_streak_pos
  FROM (
    SELECT cs.id, ROW_NUMBER() OVER (ORDER BY COALESCE(s.current_streak,0) DESC, s.last_active_date DESC NULLS LAST) AS pos
    FROM public.couple_spaces cs
    LEFT JOIN public.streaks s ON s.couple_id = cs.id
  ) ranked
  WHERE id = p_couple_id;

  SELECT pos INTO v_my_points_pos
  FROM (
    SELECT cs.id, ROW_NUMBER() OVER (ORDER BY COALESCE(p.total_points,0) DESC, s.last_active_date DESC NULLS LAST) AS pos
    FROM public.couple_spaces cs
    LEFT JOIN public.points  p ON p.couple_space_id = cs.id
    LEFT JOIN public.streaks s ON s.couple_id = cs.id
  ) ranked
  WHERE id = p_couple_id;

  -- ──────────────────────────────────────────────────────────────────────
  -- 4. RETORNO UNIFICADO
  -- ──────────────────────────────────────────────────────────────────────
  RETURN jsonb_build_object(
    'streak',        COALESCE(v_streak_ranking, '[]'::jsonb),
    'points',        COALESCE(v_points_ranking, '[]'::jsonb),
    'my_streak_pos', COALESCE(v_my_streak_pos, 0),
    'my_points_pos', COALESCE(v_my_points_pos, 0)
  );

END;
$$;
