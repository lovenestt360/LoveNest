-- Permite trocar/desativar personalizações já desbloqueadas do
-- Guardião sem perder a compra: a cor do brilho passa a ser um
-- "equipamento" que troca livremente entre as cores já desbloqueadas
-- (rosa é sempre grátis), e o anel ganha um interruptor on/off
-- independente de já ter sido comprado (ou desbloqueado no nível 7).

ALTER TABLE public.guardian_state
  ADD COLUMN IF NOT EXISTS ring_enabled boolean NOT NULL DEFAULT true;

CREATE OR REPLACE FUNCTION public.set_guardian_appearance(
  p_couple_space_id uuid,
  p_glow_color      text DEFAULT NULL,
  p_ring_enabled    boolean DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_owns_graphite boolean;
BEGIN
  IF p_glow_color IS NOT NULL AND p_glow_color NOT IN ('rose', 'graphite') THEN
    RETURN jsonb_build_object('status', 'invalid_color');
  END IF;

  IF p_glow_color = 'graphite' THEN
    SELECT EXISTS (
      SELECT 1 FROM public.shop_purchases
      WHERE couple_space_id = p_couple_space_id AND item_key = 'glow_graphite'
    ) INTO v_owns_graphite;

    IF NOT v_owns_graphite THEN
      RETURN jsonb_build_object('status', 'not_owned');
    END IF;
  END IF;

  INSERT INTO public.guardian_state (couple_space_id, glow_color, ring_enabled)
  VALUES (p_couple_space_id, COALESCE(p_glow_color, 'rose'), COALESCE(p_ring_enabled, true))
  ON CONFLICT (couple_space_id) DO UPDATE SET
    glow_color   = COALESCE(p_glow_color, public.guardian_state.glow_color),
    ring_enabled = COALESCE(p_ring_enabled, public.guardian_state.ring_enabled),
    updated_at   = now();

  RETURN jsonb_build_object('status', 'ok');
END;
$function$;

GRANT EXECUTE ON FUNCTION public.set_guardian_appearance(uuid, text, boolean) TO authenticated;
