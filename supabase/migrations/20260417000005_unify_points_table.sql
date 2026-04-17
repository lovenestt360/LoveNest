-- ══════════════════════════════════════════════════════════════════════
-- UNIFICAR TABELA DE PONTOS: public.points (NÃO love_points)
-- 
-- REGRA DEFINITIVA:
--   streaks       → couple_id      (FK do casal)
--   points        → couple_space_id (FK do casal, outro nome)
--   love_shields  → couple_space_id
--   daily_activity→ couple_id
--
-- SOURCE OF TRUTH: public.points (couple_space_id, total_points)
-- ══════════════════════════════════════════════════════════════════════

-- ──────────────────────────────────────────────────────────────────────
-- 1. fn_buy_loveshield — corrigido para public.points
-- ──────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_buy_loveshield(
  p_couple_id UUID,
  p_cost      INT DEFAULT 200
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_points INT;
BEGIN
  -- Verificar saldo em public.points (source of truth)
  SELECT COALESCE(total_points, 0) INTO v_points
  FROM public.points
  WHERE couple_space_id = p_couple_id;

  IF COALESCE(v_points, 0) < p_cost THEN
    RETURN jsonb_build_object(
      'status', 'insufficient_points',
      'current_points', COALESCE(v_points, 0)
    );
  END IF;

  -- Deduzir pontos de public.points
  UPDATE public.points
  SET total_points = total_points - p_cost,
      updated_at   = now()
  WHERE couple_space_id = p_couple_id;

  -- Adicionar shield (max 5)
  INSERT INTO public.love_shields (couple_space_id, shields)
  VALUES (p_couple_id, 1)
  ON CONFLICT (couple_space_id)
  DO UPDATE SET
    shields    = LEAST(public.love_shields.shields + 1, 5),
    updated_at = now();

  RETURN jsonb_build_object('status', 'ok');
END;
$$;

-- ──────────────────────────────────────────────────────────────────────
-- 2. fn_get_global_ranking — corrigido para public.points
-- ──────────────────────────────────────────────────────────────────────
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

      cs.id                            AS couple_space_id,
      COALESCE(cs.house_name, 'Sem nome') AS house_name,
      cs.house_image,
      COALESCE(cs.is_verified, false),
      COALESCE(s.current_streak, 0)::INT,
      COALESCE(p.total_points, 0)::BIGINT

    FROM public.couple_spaces cs
    LEFT JOIN public.streaks s  ON s.couple_id       = cs.id
    LEFT JOIN public.points  p  ON p.couple_space_id = cs.id

    ORDER BY COALESCE(p.total_points, 0) DESC
    LIMIT 50;

  ELSE
    -- ranking por streak (default)
    RETURN QUERY
    SELECT
      ROW_NUMBER() OVER (
        ORDER BY COALESCE(s.current_streak, 0) DESC,
                 COALESCE(p.total_points, 0) DESC
      ) AS rank,

      cs.id                            AS couple_space_id,
      COALESCE(cs.house_name, 'Sem nome') AS house_name,
      cs.house_image,
      COALESCE(cs.is_verified, false),
      COALESCE(s.current_streak, 0)::INT,
      COALESCE(p.total_points, 0)::BIGINT

    FROM public.couple_spaces cs
    LEFT JOIN public.streaks s  ON s.couple_id       = cs.id
    LEFT JOIN public.points  p  ON p.couple_space_id = cs.id

    ORDER BY COALESCE(s.current_streak, 0) DESC
    LIMIT 50;

  END IF;

END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_buy_loveshield(UUID, INT)     TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_get_global_ranking(TEXT)      TO authenticated, anon;

NOTIFY pgrst, 'reload schema';

SELECT 'Unificação concluída — tudo lê de public.points ✓' AS resultado;
