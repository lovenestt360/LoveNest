-- O Guardião + Loja de personalização — Fase 4 do LoveNest Progress System
-- Ver docs/LOVENEST_PROGRESS_SYSTEM.md, secções 5, 7.4 e 9.1.

CREATE TABLE IF NOT EXISTS public.guardian_state (
  couple_space_id uuid        PRIMARY KEY REFERENCES couple_spaces(id) ON DELETE CASCADE,
  glow_color      text        NOT NULL DEFAULT 'rose',  -- 'rose' | 'graphite'
  ring_unlocked   boolean     NOT NULL DEFAULT false,
  updated_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.guardian_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "couple members select guardian_state"
  ON public.guardian_state FOR SELECT
  USING (is_member_of_couple_space(couple_space_id));

CREATE TABLE IF NOT EXISTS public.shop_purchases (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_space_id uuid        NOT NULL REFERENCES couple_spaces(id) ON DELETE CASCADE,
  user_id         uuid,
  item_key        text        NOT NULL,   -- 'glow_graphite' | 'guardian_ring'
  price_paid      integer     NOT NULL,
  purchased_at    timestamptz NOT NULL DEFAULT now(),

  UNIQUE (couple_space_id, item_key)
);

ALTER TABLE public.shop_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "couple members select shop_purchases"
  ON public.shop_purchases FOR SELECT
  USING (is_member_of_couple_space(couple_space_id));

-- guardian_state e shop_purchases só são escritas via esta função
-- SECURITY DEFINER (mesmo padrão de award_lovepoints/fn_buy_loveshield) —
-- por isso não têm policy de INSERT/UPDATE direta.
CREATE OR REPLACE FUNCTION public.buy_guardian_item(
  p_couple_space_id uuid,
  p_item_key        text,
  p_user_id         uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_price   integer;
  v_points  integer;
  v_already boolean;
BEGIN
  v_price := CASE p_item_key
    WHEN 'glow_graphite' THEN 150
    WHEN 'guardian_ring'  THEN 300
    ELSE NULL
  END;

  IF v_price IS NULL THEN
    RETURN jsonb_build_object('status', 'invalid_item');
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.shop_purchases
    WHERE couple_space_id = p_couple_space_id AND item_key = p_item_key
  ) INTO v_already;

  IF v_already THEN
    RETURN jsonb_build_object('status', 'already_purchased');
  END IF;

  SELECT COALESCE(total_points, 0) INTO v_points
  FROM public.points WHERE couple_space_id = p_couple_space_id;

  IF COALESCE(v_points, 0) < v_price THEN
    RETURN jsonb_build_object('status', 'insufficient_points');
  END IF;

  INSERT INTO public.shop_purchases (couple_space_id, user_id, item_key, price_paid)
  VALUES (p_couple_space_id, p_user_id, p_item_key, v_price);

  PERFORM public.award_lovepoints(p_couple_space_id, -v_price, 'compra_loja', 'Compra: ' || p_item_key, p_user_id);

  IF p_item_key = 'glow_graphite' THEN
    INSERT INTO public.guardian_state (couple_space_id, glow_color)
    VALUES (p_couple_space_id, 'graphite')
    ON CONFLICT (couple_space_id) DO UPDATE SET glow_color = 'graphite', updated_at = now();
  ELSIF p_item_key = 'guardian_ring' THEN
    INSERT INTO public.guardian_state (couple_space_id, ring_unlocked)
    VALUES (p_couple_space_id, true)
    ON CONFLICT (couple_space_id) DO UPDATE SET ring_unlocked = true, updated_at = now();
  END IF;

  RETURN jsonb_build_object('status', 'ok');
END;
$function$;

GRANT EXECUTE ON FUNCTION public.buy_guardian_item(uuid, text, uuid) TO authenticated;
