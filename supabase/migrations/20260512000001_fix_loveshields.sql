-- ══════════════════════════════════════════════════════════════════════
-- FIX 2026-05-12: LoveShields — escudos correctos
--
-- Problemas:
--   A) shield_used_today sempre FALSE em get_streak
--      → "Chama protegida" nunca aparece mesmo quando shield foi usado
--   B) Shields só consumidos no próximo check-in de ambos
--      → utilizador que falha o dia continua a ver o shield sem ele "desaparecer"
--   C) fn_buy_loveshield permitia até 5 escudos
--      → acordo é 3 escudos/mês + compra até máx 3
--
-- Fixes:
--   1. Adicionar last_shield_used_date a love_shields (tracking de quando shield foi usado)
--   2. update_streak regista last_shield_used_date ao consumir shields
--   3. get_streak auto-aplica shields para dias perdidos (quando shields >= gap)
--      e devolve shield_used_today correctamente a partir de last_shield_used_date
--   4. fn_buy_loveshield: limite 5 → 3
-- ══════════════════════════════════════════════════════════════════════


-- ── A) Adicionar coluna de tracking ───────────────────────────────────

ALTER TABLE public.love_shields
  ADD COLUMN IF NOT EXISTS last_shield_used_date DATE DEFAULT NULL;


-- ── B) update_streak — regista data de uso do shield ─────────────────
--
-- Baseado em 20260509000001 (trata gap >= 1) + adiciona last_shield_used_date.
-- Mantém longest_streak de 20260501000001.

DROP FUNCTION IF EXISTS public.update_streak(UUID);

CREATE OR REPLACE FUNCTION public.update_streak(p_couple_space_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today       DATE := CURRENT_DATE;
  v_today_count INT;
  v_members     INT;
  v_last_date   DATE;
  v_current     INT;
  v_longest     INT;
  v_shields     INT;
  v_gap         INT;
  v_new_streak  INT;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext(p_couple_space_id::TEXT));

  SELECT COUNT(*) INTO v_members
  FROM public.members WHERE couple_space_id = p_couple_space_id;
  IF v_members < 2 THEN RETURN; END IF;

  SELECT COUNT(DISTINCT user_id) INTO v_today_count
  FROM public.daily_activity
  WHERE couple_space_id = p_couple_space_id AND activity_date = v_today;
  IF v_today_count < v_members THEN RETURN; END IF;

  SELECT COALESCE(streak_count, 0), last_streak_date, COALESCE(longest_streak, 0)
  INTO v_current, v_last_date, v_longest
  FROM public.couple_spaces WHERE id = p_couple_space_id FOR UPDATE;
  IF NOT FOUND THEN RETURN; END IF;
  IF v_last_date = v_today THEN RETURN; END IF;

  v_gap := CASE
    WHEN v_last_date IS NULL THEN 0
    ELSE GREATEST((v_today - v_last_date) - 1, 0)
  END;

  IF v_gap = 0 THEN
    -- Dia consecutivo: incrementa streak
    v_new_streak := v_current + 1;
    UPDATE public.couple_spaces
    SET streak_count   = v_new_streak,
        last_streak_date = v_today,
        longest_streak = GREATEST(COALESCE(longest_streak, 0), v_new_streak)
    WHERE id = p_couple_space_id;

  ELSIF v_gap >= 1 THEN
    -- Gap de 1+ dias: tenta usar shields
    SELECT COALESCE(shields, 0) INTO v_shields
    FROM public.love_shields WHERE couple_space_id = p_couple_space_id;

    IF COALESCE(v_shields, 0) >= v_gap THEN
      -- Shields cobrem o gap: consumir e manter streak
      UPDATE public.love_shields
      SET shields               = GREATEST(shields - v_gap, 0),
          last_shield_used_date = v_today,
          updated_at            = now()
      WHERE couple_space_id = p_couple_space_id;

      v_new_streak := v_current + 1;
      UPDATE public.couple_spaces
      SET streak_count     = v_new_streak,
          last_streak_date = v_today,
          longest_streak   = GREATEST(COALESCE(longest_streak, 0), v_new_streak)
      WHERE id = p_couple_space_id;

    ELSE
      -- Shields insuficientes: consumir todos e quebrar streak para 1
      IF COALESCE(v_shields, 0) > 0 THEN
        UPDATE public.love_shields
        SET shields               = 0,
            last_shield_used_date = v_today,
            updated_at            = now()
        WHERE couple_space_id = p_couple_space_id;
      END IF;

      UPDATE public.couple_spaces
      SET streak_count     = 1,
          last_streak_date = v_today
      WHERE id = p_couple_space_id;
    END IF;
  END IF;

  -- +10 pontos por dia completo
  INSERT INTO public.points (couple_space_id, total_points)
  VALUES (p_couple_space_id, 10)
  ON CONFLICT (couple_space_id)
  DO UPDATE SET total_points = public.points.total_points + 10, updated_at = now();

END;
$$;

GRANT EXECUTE ON FUNCTION public.update_streak(UUID) TO authenticated;


-- Recriar trigger (aponta para função atualizada)
CREATE OR REPLACE FUNCTION public.tr_fn_on_daily_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.update_streak(NEW.couple_space_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_lovestreak_on_activity ON public.daily_activity;
CREATE TRIGGER tr_lovestreak_on_activity
AFTER INSERT ON public.daily_activity
FOR EACH ROW EXECUTE FUNCTION public.tr_fn_on_daily_activity();


-- ── C) get_streak — auto-aplica shields + shield_used_today correto ───
--
-- Novidade: quando há dias perdidos (gap >= 1) e os shields cobrem o gap,
-- o get_streak aplica automaticamente a protecção:
--   - Decrementa shields atomicamente (AND shields >= v_gap como guard)
--   - Avança last_streak_date para ontem (idempotente: AND last_streak_date = v_last)
--   - Define last_shield_used_date = hoje
-- Assim o utilizador vê o shield "desaparecido" assim que abre a app,
-- sem ter de esperar pelo próximo check-in de ambos.
--
-- Idempotência garantida:
--   - Segunda chamada vê v_last = ontem → condição (v_last < ontem) é FALSE → sem acção
--   - update_streak posterior vê gap = 0 (ontem → hoje) → incrementa normalmente

DROP FUNCTION IF EXISTS public.get_streak(UUID);

CREATE OR REPLACE FUNCTION public.get_streak(p_couple_space_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today             DATE    := CURRENT_DATE;
  v_current_month     TEXT    := to_char(CURRENT_DATE, 'YYYY-MM');
  v_current           INT     := 0;
  v_longest           INT     := 0;
  v_last              DATE;
  v_active            INT     := 0;
  v_total             INT     := 0;
  v_shields           INT     := 0;
  v_last_replenished  TEXT;
  v_shield_used_date  DATE;
  v_shield_used_today BOOLEAN := FALSE;
  v_my_checked_in     BOOLEAN := FALSE;
  v_gap               INT     := 0;
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
  SELECT COALESCE(shields, 0), last_replenished_month, last_shield_used_date
  INTO v_shields, v_last_replenished, v_shield_used_date
  FROM public.love_shields WHERE couple_space_id = p_couple_space_id;

  IF NOT FOUND THEN
    -- Casal novo: criar registo com 3 shields
    INSERT INTO public.love_shields (couple_space_id, shields, last_replenished_month)
    VALUES (p_couple_space_id, 3, v_current_month)
    ON CONFLICT (couple_space_id) DO NOTHING;
    v_shields          := 3;
    v_shield_used_date := NULL;

  ELSIF v_last_replenished IS NULL OR v_last_replenished < v_current_month THEN
    -- Início de novo mês: repor para pelo menos 3 shields
    UPDATE public.love_shields
    SET shields                = GREATEST(shields, 3),
        last_replenished_month = v_current_month,
        updated_at             = now()
    WHERE couple_space_id = p_couple_space_id;
    v_shields := GREATEST(v_shields, 3);
  END IF;

  -- Auto-aplicar shields para dias perdidos
  -- Condições: streak > 0, último dia activo foi ANTES de ontem, shields cobrem o gap
  -- (Se update_streak já correu hoje, last_streak_date = hoje → condição é FALSE)
  IF v_current > 0
     AND v_last IS NOT NULL
     AND v_last < (v_today - INTERVAL '1 day')::DATE
  THEN
    v_gap := (v_today - v_last) - 1;  -- dias em falta

    IF v_gap >= 1 AND v_shields >= v_gap THEN
      -- Consumir shields atomicamente (AND shields >= v_gap previne race condition)
      UPDATE public.love_shields
      SET shields               = GREATEST(shields - v_gap, 0),
          last_shield_used_date = v_today,
          updated_at            = now()
      WHERE couple_space_id = p_couple_space_id
        AND shields >= v_gap;

      IF FOUND THEN
        -- Avançar last_streak_date para cobrir o gap
        -- (AND last_streak_date = v_last garante idempotência)
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

  v_shield_used_today := (v_shield_used_date IS NOT NULL AND v_shield_used_date = v_today);

  RETURN jsonb_build_object(
    -- Streak (múltiplos aliases para compatibilidade)
    'streak',             v_current,
    'current',            v_current,
    'current_streak',     v_current,
    'longest',            v_longest,
    'longest_streak',     v_longest,
    'last_date',          v_last,
    'last_active_date',   v_last,
    'last_streak_date',   v_last,

    -- Status derivado
    'status', CASE
      WHEN v_last IS NULL                                THEN 'active'
      WHEN v_last >= (v_today - INTERVAL '1 day')::DATE THEN 'active'
      ELSE 'broken'
    END,

    -- Actividade de hoje
    'active_today',        v_active,
    'active_today_count',  v_active,
    'both_active',         (v_active >= v_total AND v_total >= 2),
    'both_active_today',   (v_active >= v_total AND v_total >= 2),
    'my_checked_in',       v_my_checked_in,
    'member_count',        v_total,
    'total_members',       v_total,

    -- Shields
    'shields_remaining',            v_shields,
    'shield_used_today',            v_shield_used_today,
    'shields_purchased_this_month', 0,

    -- Gamificação
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


-- ── D) fn_buy_loveshield — limite 5 → 3 ─────────────────────────────
--
-- O acordo é: 3 escudos por mês (repostos automaticamente).
-- O casal pode comprar de volta até ao máximo de 3 usando pontos.
-- Não faz sentido ter mais de 3 em simultâneo.

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
  v_points  INT;
  v_shields INT;
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

  -- Verificar limite de 3 shields
  SELECT COALESCE(shields, 0) INTO v_shields
  FROM public.love_shields WHERE couple_space_id = p_couple_space_id;

  IF COALESCE(v_shields, 0) >= 3 THEN
    RETURN jsonb_build_object('status', 'limit_reached');
  END IF;

  -- Deduzir pontos
  UPDATE public.points
  SET total_points = total_points - p_cost,
      updated_at   = now()
  WHERE couple_space_id = p_couple_space_id;

  -- Adicionar shield (máx 3)
  INSERT INTO public.love_shields (couple_space_id, shields, last_replenished_month)
  VALUES (p_couple_space_id, 1, to_char(CURRENT_DATE, 'YYYY-MM'))
  ON CONFLICT (couple_space_id)
  DO UPDATE SET
    shields    = LEAST(public.love_shields.shields + 1, 3),
    updated_at = now();

  RETURN jsonb_build_object('status', 'ok');
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_buy_loveshield(UUID, INT) TO authenticated;


NOTIFY pgrst, 'reload schema';

SELECT
  'fix loveshields: tracking + auto-apply + limite 3 ✓' AS resultado,
  'A: last_shield_used_date | B: update_streak regista data | C: get_streak auto-apply + shield_used_today | D: fn_buy_loveshield cap 3' AS fixes;
