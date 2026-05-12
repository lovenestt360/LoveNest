-- ══════════════════════════════════════════════════════════════════════
-- FIX 2026-05-12 #2: LoveShields — 1 compra por mês
--
-- Regra: cada casal recebe 3 escudos por mês (grátis).
-- Se perderem 1, 2 ou os 3, podem comprar APENAS +1 nesse mês.
-- No mês seguinte voltam aos 3 e podem comprar +1 outra vez.
--
-- Fixes:
--   1. Adicionar last_purchased_month a love_shields
--   2. fn_buy_loveshield verifica se já compraram neste mês
--   3. get_streak devolve shields_purchased_this_month correctamente
-- ══════════════════════════════════════════════════════════════════════

-- ── 1. Coluna para rastrear quando foi a última compra ────────────────

ALTER TABLE public.love_shields
  ADD COLUMN IF NOT EXISTS last_purchased_month TEXT DEFAULT NULL;


-- ── 2. fn_buy_loveshield — 1 compra por mês ──────────────────────────

DROP FUNCTION IF EXISTS public.fn_buy_loveshield(UUID, INT);

CREATE OR REPLACE FUNCTION public.fn_buy_loveshield(
  p_couple_space_id UUID,
  p_cost            INT DEFAULT 200
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_points          INT;
  v_shields         INT;
  v_last_purchased  TEXT;
  v_current_month   TEXT := to_char(CURRENT_DATE, 'YYYY-MM');
BEGIN
  -- Verificar saldo de pontos
  SELECT COALESCE(total_points, 0) INTO v_points
  FROM public.points WHERE couple_space_id = p_couple_space_id;

  IF COALESCE(v_points, 0) < p_cost THEN
    RETURN jsonb_build_object(
      'status',         'insufficient_points',
      'current_points', COALESCE(v_points, 0)
    );
  END IF;

  -- Verificar estado dos shields
  SELECT COALESCE(shields, 0), last_purchased_month
  INTO v_shields, v_last_purchased
  FROM public.love_shields WHERE couple_space_id = p_couple_space_id;

  -- Já compraram 1 escudo este mês
  IF v_last_purchased = v_current_month THEN
    RETURN jsonb_build_object('status', 'already_purchased_this_month');
  END IF;

  -- Já têm 3 escudos (sem perdas) — não precisam de comprar
  IF COALESCE(v_shields, 0) >= 3 THEN
    RETURN jsonb_build_object('status', 'limit_reached');
  END IF;

  -- Deduzir pontos
  UPDATE public.points
  SET total_points = total_points - p_cost,
      updated_at   = now()
  WHERE couple_space_id = p_couple_space_id;

  -- Adicionar +1 escudo e registar o mês de compra
  INSERT INTO public.love_shields (couple_space_id, shields, last_replenished_month, last_purchased_month)
  VALUES (p_couple_space_id, 1, v_current_month, v_current_month)
  ON CONFLICT (couple_space_id)
  DO UPDATE SET
    shields              = LEAST(public.love_shields.shields + 1, 3),
    last_purchased_month = v_current_month,
    updated_at           = now();

  RETURN jsonb_build_object('status', 'ok');
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_buy_loveshield(UUID, INT) TO authenticated;


-- ── 3. get_streak — devolve shields_purchased_this_month correcto ─────

DROP FUNCTION IF EXISTS public.get_streak(UUID);

CREATE OR REPLACE FUNCTION public.get_streak(p_couple_space_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today                    DATE    := CURRENT_DATE;
  v_current_month            TEXT    := to_char(CURRENT_DATE, 'YYYY-MM');
  v_current                  INT     := 0;
  v_longest                  INT     := 0;
  v_last                     DATE;
  v_active                   INT     := 0;
  v_total                    INT     := 0;
  v_shields                  INT     := 0;
  v_last_replenished         TEXT;
  v_last_purchased           TEXT;
  v_shield_used_date         DATE;
  v_shield_used_today        BOOLEAN := FALSE;
  v_my_checked_in            BOOLEAN := FALSE;
  v_gap                      INT     := 0;
  v_purchased_this_month     INT     := 0;
BEGIN
  -- Streak + longest
  SELECT COALESCE(streak_count, 0), COALESCE(longest_streak, 0), last_streak_date
  INTO v_current, v_longest, v_last
  FROM public.couple_spaces WHERE id = p_couple_space_id;

  -- Activos hoje
  SELECT COUNT(DISTINCT user_id) INTO v_active
  FROM public.daily_activity
  WHERE couple_space_id = p_couple_space_id AND activity_date = v_today;

  -- Eu fiz check-in hoje?
  SELECT EXISTS (
    SELECT 1 FROM public.daily_activity
    WHERE couple_space_id = p_couple_space_id
      AND user_id         = auth.uid()
      AND activity_date   = v_today
  ) INTO v_my_checked_in;

  v_total := public.fn_count_active_members(p_couple_space_id);

  -- Shields com reposição mensal automática
  SELECT COALESCE(shields, 0), last_replenished_month, last_shield_used_date, last_purchased_month
  INTO v_shields, v_last_replenished, v_shield_used_date, v_last_purchased
  FROM public.love_shields WHERE couple_space_id = p_couple_space_id;

  IF NOT FOUND THEN
    INSERT INTO public.love_shields (couple_space_id, shields, last_replenished_month)
    VALUES (p_couple_space_id, 3, v_current_month)
    ON CONFLICT (couple_space_id) DO NOTHING;
    v_shields          := 3;
    v_shield_used_date := NULL;
    v_last_purchased   := NULL;

  ELSIF v_last_replenished IS NULL OR v_last_replenished < v_current_month THEN
    -- Novo mês: repor para 3 shields (reset total, não GREATEST)
    UPDATE public.love_shields
    SET shields                = 3,
        last_replenished_month = v_current_month,
        updated_at             = now()
    WHERE couple_space_id = p_couple_space_id;
    v_shields := 3;
  END IF;

  -- Auto-aplicar shields para dias perdidos (shields cobrem o gap)
  IF v_current > 0
     AND v_last IS NOT NULL
     AND v_last < (v_today - INTERVAL '1 day')::DATE
  THEN
    v_gap := (v_today - v_last) - 1;

    IF v_gap >= 1 AND v_shields >= v_gap THEN
      UPDATE public.love_shields
      SET shields               = GREATEST(shields - v_gap, 0),
          last_shield_used_date = v_today,
          updated_at            = now()
      WHERE couple_space_id = p_couple_space_id
        AND shields >= v_gap;

      IF FOUND THEN
        UPDATE public.couple_spaces
        SET last_streak_date = (v_today - INTERVAL '1 day')::DATE
        WHERE id             = p_couple_space_id
          AND last_streak_date = v_last;

        v_shields          := v_shields - v_gap;
        v_last             := (v_today - INTERVAL '1 day')::DATE;
        v_shield_used_date := v_today;
      END IF;
    END IF;
  END IF;

  v_shield_used_today    := (v_shield_used_date IS NOT NULL AND v_shield_used_date = v_today);
  v_purchased_this_month := CASE WHEN v_last_purchased = v_current_month THEN 1 ELSE 0 END;

  RETURN jsonb_build_object(
    'streak',             v_current,
    'current',            v_current,
    'current_streak',     v_current,
    'longest',            v_longest,
    'longest_streak',     v_longest,
    'last_date',          v_last,
    'last_active_date',   v_last,
    'last_streak_date',   v_last,

    'status', CASE
      WHEN v_last IS NULL                                THEN 'active'
      WHEN v_last >= (v_today - INTERVAL '1 day')::DATE THEN 'active'
      ELSE 'broken'
    END,

    'active_today',        v_active,
    'active_today_count',  v_active,
    'both_active',         (v_active >= v_total AND v_total >= 2),
    'both_active_today',   (v_active >= v_total AND v_total >= 2),
    'my_checked_in',       v_my_checked_in,
    'member_count',        v_total,
    'total_members',       v_total,

    'shields_remaining',            v_shields,
    'shield_used_today',            v_shield_used_today,
    'shields_purchased_this_month', v_purchased_this_month,

    'progress_percentage', LEAST(ROUND((v_current::NUMERIC / 28) * 100), 100),
    'streak_at_risk', (
      v_active < v_total
      AND v_total >= 2
      AND v_current > 0
      AND v_last = (v_today - INTERVAL '1 day')::DATE
    ),
    'days_since_last_activity', CASE
      WHEN v_last IS NOT NULL THEN (v_today - v_last)
      ELSE NULL
    END
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_streak(UUID) TO authenticated;


NOTIFY pgrst, 'reload schema';

SELECT
  '1 compra de escudo por mês ✓' AS resultado,
  '1: last_purchased_month | 2: fn_buy_loveshield bloqueia 2ª compra no mês | 3: get_streak devolve shields_purchased_this_month real' AS fixes;
