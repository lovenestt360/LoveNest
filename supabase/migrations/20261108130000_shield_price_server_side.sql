-- Comprar escudo: o preço passa a estar só no servidor, e a compra fica no extrato de pontos.
-- A função deixa de receber o preço, por isso as duas versões antigas são removidas.
-- Idempotente. Aplicar à mão no SQL Editor do Supabase.

BEGIN;

DROP FUNCTION IF EXISTS public.fn_buy_loveshield(UUID, INT);
DROP FUNCTION IF EXISTS public.fn_buy_loveshield__sem_porta(UUID, INT);

-- Versões antigas da compra de escudo, que a app já não usa.
DROP FUNCTION IF EXISTS public.fn_purchase_loveshield(INTEGER);
DROP FUNCTION IF EXISTS public.fn_purchase_loveshield_v4(INTEGER);

CREATE OR REPLACE FUNCTION public.fn_buy_loveshield(p_couple_space_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cost           CONSTANT INT := 200;
  v_points         INT;
  v_shields        INT;
  v_last_purchased TEXT;
  v_current_month  TEXT := to_char(CURRENT_DATE, 'YYYY-MM');
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_member_of_couple_space(p_couple_space_id) THEN
    RAISE EXCEPTION 'Sem acesso a esta casa' USING ERRCODE = '42501';
  END IF;

  -- Acerta os escudos do mês antes de decidir e garante que a linha existe.
  PERFORM public.fn_settle_streak(p_couple_space_id);

  SELECT COALESCE(shields, 0), last_purchased_month
  INTO v_shields, v_last_purchased
  FROM public.love_shields WHERE couple_space_id = p_couple_space_id FOR UPDATE;

  IF v_last_purchased = v_current_month THEN
    RETURN jsonb_build_object('status', 'already_purchased_this_month');
  END IF;

  IF COALESCE(v_shields, 0) >= 3 THEN
    RETURN jsonb_build_object('status', 'limit_reached');
  END IF;

  SELECT COALESCE(total_points, 0) INTO v_points
  FROM public.points WHERE couple_space_id = p_couple_space_id FOR UPDATE;

  IF COALESCE(v_points, 0) < v_cost THEN
    RETURN jsonb_build_object('status', 'insufficient_points', 'current_points', COALESCE(v_points, 0));
  END IF;

  PERFORM public.award_lovepoints(p_couple_space_id, -v_cost, 'compra_escudo', 'Escudo comprado', auth.uid());

  UPDATE public.love_shields
  SET shields              = LEAST(COALESCE(shields, 0) + 1, 3),
      last_purchased_month = v_current_month,
      updated_at           = now()
  WHERE couple_space_id = p_couple_space_id;

  RETURN jsonb_build_object('status', 'ok');
END;
$$;

REVOKE ALL ON FUNCTION public.fn_buy_loveshield(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_buy_loveshield(UUID) TO authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;
