-- ══════════════════════════════════════════════════════════════════════
-- LOVESHIELD SHOP V1 — Compra de escudo com pontos (love_points)
-- Compatível com tabelas existentes: love_shields, love_points
-- ══════════════════════════════════════════════════════════════════════

-- Função para ler o saldo de shields do casal (sem auth.uid())
CREATE OR REPLACE FUNCTION public.fn_get_shields(p_couple_id UUID)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_shields INT;
BEGIN
  SELECT COALESCE(shields, 0) INTO v_shields
  FROM public.love_shields
  WHERE couple_space_id = p_couple_id;
  RETURN COALESCE(v_shields, 0);
END;
$$;

-- Função para comprar shield com pontos (explícito, sem auth.uid())
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
  -- Verificar saldo de pontos
  SELECT COALESCE(total_points, 0) INTO v_points
  FROM public.love_points
  WHERE couple_space_id = p_couple_id;

  IF COALESCE(v_points, 0) < p_cost THEN
    RETURN jsonb_build_object('status', 'insufficient_points', 'current_points', v_points);
  END IF;

  -- Deduzir pontos
  UPDATE public.love_points
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

GRANT EXECUTE ON FUNCTION public.fn_get_shields(UUID)    TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_buy_loveshield(UUID, INT) TO authenticated;

NOTIFY pgrst, 'reload schema';

SELECT 'fn_get_shields + fn_buy_loveshield criadas ✓' AS resultado;
