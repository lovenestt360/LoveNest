-- Avisos da chama: fn_settle_streak guarda o último acontecimento da casa em
-- love_shields.last_event, e a função smart-notifications envia o aviso aos membros.
--   {"kind": "shield_used", "days": 12, "used": 1, "left": 2, "at": "..."}
--   {"kind": "flame_lost",  "days": 12, "at": "..."}
-- Idempotente. Aplicar à mão no SQL Editor do Supabase, antes de atualizar a função.

BEGIN;

ALTER TABLE public.love_shields ADD COLUMN IF NOT EXISTS last_event JSONB;

CREATE OR REPLACE FUNCTION public.fn_settle_streak(p_couple_space_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today       DATE;
  v_month       TEXT;
  v_streak      INT;
  v_last        DATE;
  v_shields     INT;
  v_replenished TEXT;
  v_day         DATE;
  v_spent       INT     := 0;
  v_broke       BOOLEAN := FALSE;
  v_event       JSONB;
BEGIN
  SELECT MIN((now() AT TIME ZONE COALESCE(NULLIF(btrim(p.timezone), ''), 'UTC'))::DATE)
  INTO v_today
  FROM public.members m
  LEFT JOIN public.profiles p ON p.user_id = m.user_id
  WHERE m.couple_space_id = p_couple_space_id;
  IF v_today IS NULL THEN RETURN; END IF;
  v_month := to_char(v_today, 'YYYY-MM');

  PERFORM pg_advisory_xact_lock(hashtext(p_couple_space_id::TEXT));

  SELECT COALESCE(streak_count, 0), last_streak_date
  INTO v_streak, v_last
  FROM public.couple_spaces WHERE id = p_couple_space_id FOR UPDATE;
  IF NOT FOUND THEN RETURN; END IF;

  INSERT INTO public.love_shields (couple_space_id, shields, last_replenished_month)
  VALUES (p_couple_space_id, 3, v_month)
  ON CONFLICT (couple_space_id) DO NOTHING;

  SELECT COALESCE(shields, 0), last_replenished_month
  INTO v_shields, v_replenished
  FROM public.love_shields WHERE couple_space_id = p_couple_space_id FOR UPDATE;

  IF v_streak > 0 AND v_last IS NOT NULL AND v_last < v_today - 1 THEN
    v_day := v_last + 1;
    WHILE v_day < v_today LOOP
      -- Um dia em falta noutro mês usa os escudos desse mês.
      IF v_replenished IS NULL OR v_replenished < to_char(v_day, 'YYYY-MM') THEN
        v_shields := 3;
        v_replenished := to_char(v_day, 'YYYY-MM');
      END IF;

      IF v_shields <= 0 THEN
        v_broke := TRUE;
        EXIT;
      END IF;
      v_shields := v_shields - 1;
      v_spent := v_spent + 1;
      v_day := v_day + 1;
    END LOOP;

    IF v_broke THEN
      UPDATE public.couple_spaces
      SET streak_count = 0, last_streak_date = NULL
      WHERE id = p_couple_space_id;
    ELSE
      UPDATE public.couple_spaces
      SET last_streak_date = v_today - 1
      WHERE id = p_couple_space_id;
    END IF;
  END IF;

  -- Novo mês: volta aos 3 escudos.
  IF v_replenished IS NULL OR v_replenished < v_month THEN
    v_shields := 3;
    v_replenished := v_month;
  END IF;

  IF v_broke THEN
    v_event := jsonb_build_object('kind', 'flame_lost', 'days', v_streak, 'at', now());
  ELSIF v_spent > 0 THEN
    v_event := jsonb_build_object('kind', 'shield_used', 'days', v_streak, 'used', v_spent, 'left', v_shields, 'at', now());
  END IF;

  UPDATE public.love_shields
  SET shields                = v_shields,
      last_replenished_month = v_replenished,
      last_shield_used_date  = CASE WHEN v_spent > 0 AND NOT v_broke THEN v_today ELSE last_shield_used_date END,
      last_event             = COALESCE(v_event, last_event),
      updated_at             = now()
  WHERE couple_space_id = p_couple_space_id
    AND (shields IS DISTINCT FROM v_shields
         OR last_replenished_month IS DISTINCT FROM v_replenished
         OR v_event IS NOT NULL);
END;
$$;

REVOKE ALL ON FUNCTION public.fn_settle_streak(UUID) FROM PUBLIC, anon, authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;
