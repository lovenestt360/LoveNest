-- ══════════════════════════════════════════════════════════════════════
-- FIX 2026-05-01
--
-- Problemas:
--   A) love_shields.DEFAULT era 1 → casais devem ter 3 shields de base
--   B) Sem lógica de reposição mensal → shields ficam a 0 indefinidamente
--   C) get_streak devolve longest = current (nunca guarda máximo real)
--   D) Casais sem registo em love_shields ficam com 0 shields
--
-- Fixes:
--   1. Adicionar coluna last_replenished_month a love_shields
--   2. Adicionar coluna longest_streak a couple_spaces
--   3. Repor todos os casais existentes a 3 shields agora
--   4. Criar registos para casais sem love_shields
--   5. Actualizar update_streak para guardar longest_streak
--   6. Substituir get_streak com reposição mensal automática
-- ══════════════════════════════════════════════════════════════════════

-- ── 1. love_shields: corrigir DEFAULT e adicionar tracking mensal ─────

ALTER TABLE public.love_shields
  ALTER COLUMN shields SET DEFAULT 3;

ALTER TABLE public.love_shields
  ADD COLUMN IF NOT EXISTS last_replenished_month TEXT DEFAULT NULL;

-- ── 2. couple_spaces: adicionar longest_streak ───────────────────────

ALTER TABLE public.couple_spaces
  ADD COLUMN IF NOT EXISTS longest_streak INT DEFAULT 0;

-- Inicializar longest_streak ao valor actual do streak (melhor estimate)
UPDATE public.couple_spaces
SET longest_streak = COALESCE(streak_count, 0)
WHERE longest_streak IS NULL OR longest_streak = 0;

-- ── 3. Repor shields de todos os casais existentes ────────────────────

UPDATE public.love_shields
SET shields                = GREATEST(COALESCE(shields, 0), 3),
    last_replenished_month = to_char(CURRENT_DATE, 'YYYY-MM'),
    updated_at             = now();

-- ── 4. Criar registo para casais sem love_shields ─────────────────────

INSERT INTO public.love_shields (couple_space_id, shields, last_replenished_month)
SELECT cs.id, 3, to_char(CURRENT_DATE, 'YYYY-MM')
FROM public.couple_spaces cs
WHERE NOT EXISTS (
  SELECT 1 FROM public.love_shields ls
  WHERE ls.couple_space_id = cs.id
);

-- ── 5. update_streak — guardar longest_streak ────────────────────────

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
  FROM public.members
  WHERE couple_space_id = p_couple_space_id;

  IF v_members < 2 THEN RETURN; END IF;

  SELECT COUNT(DISTINCT user_id) INTO v_today_count
  FROM public.daily_activity
  WHERE couple_space_id = p_couple_space_id
    AND activity_date   = v_today;

  IF v_today_count < v_members THEN RETURN; END IF;

  SELECT COALESCE(streak_count, 0), last_streak_date, COALESCE(longest_streak, 0)
  INTO v_current, v_last_date, v_longest
  FROM public.couple_spaces
  WHERE id = p_couple_space_id
  FOR UPDATE;

  IF NOT FOUND THEN RETURN; END IF;
  IF v_last_date = v_today THEN RETURN; END IF;

  v_gap := CASE
    WHEN v_last_date IS NULL THEN 0
    ELSE GREATEST((v_today - v_last_date) - 1, 0)
  END;

  IF v_gap = 0 THEN
    v_new_streak := v_current + 1;
    UPDATE public.couple_spaces
    SET streak_count     = v_new_streak,
        last_streak_date = v_today,
        longest_streak   = GREATEST(COALESCE(longest_streak, 0), v_new_streak)
    WHERE id = p_couple_space_id;

  ELSIF v_gap = 1 THEN
    SELECT COALESCE(shields, 0) INTO v_shields
    FROM public.love_shields
    WHERE couple_space_id = p_couple_space_id;

    IF COALESCE(v_shields, 0) > 0 THEN
      UPDATE public.love_shields
      SET shields    = GREATEST(shields - 1, 0),
          updated_at = now()
      WHERE couple_space_id = p_couple_space_id;

      v_new_streak := v_current + 1;
      UPDATE public.couple_spaces
      SET streak_count     = v_new_streak,
          last_streak_date = v_today,
          longest_streak   = GREATEST(COALESCE(longest_streak, 0), v_new_streak)
      WHERE id = p_couple_space_id;
    ELSE
      UPDATE public.couple_spaces
      SET streak_count     = 1,
          last_streak_date = v_today
          -- longest_streak não muda (quebra)
      WHERE id = p_couple_space_id;
    END IF;

  ELSE
    UPDATE public.couple_spaces
    SET streak_count     = 1,
        last_streak_date = v_today
    WHERE id = p_couple_space_id;
  END IF;

  -- +10 pontos por dia completo
  INSERT INTO public.points (couple_space_id, total_points)
  VALUES (p_couple_space_id, 10)
  ON CONFLICT (couple_space_id)
  DO UPDATE SET
    total_points = public.points.total_points + 10,
    updated_at   = now();

END;
$$;

GRANT EXECUTE ON FUNCTION public.update_streak(UUID) TO authenticated;

-- ── 6. get_streak — reposição mensal de shields + longest_streak real ─

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
  v_my_checked_in     BOOLEAN := FALSE;
BEGIN
  -- Streak + longest
  SELECT COALESCE(streak_count, 0), COALESCE(longest_streak, 0), last_streak_date
  INTO v_current, v_longest, v_last
  FROM public.couple_spaces
  WHERE id = p_couple_space_id;

  -- Activos hoje
  SELECT COUNT(DISTINCT user_id) INTO v_active
  FROM public.daily_activity
  WHERE couple_space_id = p_couple_space_id
    AND activity_date   = v_today;

  -- O utilizador actual fez check-in hoje?
  SELECT EXISTS (
    SELECT 1 FROM public.daily_activity
    WHERE couple_space_id = p_couple_space_id
      AND user_id         = auth.uid()
      AND activity_date   = v_today
  ) INTO v_my_checked_in;

  -- Total de membros
  v_total := public.fn_count_active_members(p_couple_space_id);

  -- Shields com reposição mensal automática
  SELECT COALESCE(shields, 0), last_replenished_month
  INTO v_shields, v_last_replenished
  FROM public.love_shields
  WHERE couple_space_id = p_couple_space_id;

  IF NOT FOUND THEN
    -- Casal sem registo: criar com 3 shields
    INSERT INTO public.love_shields (couple_space_id, shields, last_replenished_month)
    VALUES (p_couple_space_id, 3, v_current_month)
    ON CONFLICT (couple_space_id) DO NOTHING;
    v_shields := 3;
  ELSIF v_last_replenished IS NULL OR v_last_replenished < v_current_month THEN
    -- Novo mês: repor para pelo menos 3 shields (não reduz se compraram mais)
    UPDATE public.love_shields
    SET shields                = GREATEST(shields, 3),
        last_replenished_month = v_current_month,
        updated_at             = now()
    WHERE couple_space_id = p_couple_space_id;
    v_shields := GREATEST(v_shields, 3);
  END IF;

  RETURN jsonb_build_object(
    -- Streak
    'streak',             v_current,
    'current',            v_current,
    'current_streak',     v_current,
    'longest',            v_longest,
    'longest_streak',     v_longest,
    'last_date',          v_last,
    'last_active_date',   v_last,
    'last_streak_date',   v_last,

    -- Status
    'status', CASE
      WHEN v_last IS NULL                                THEN 'active'
      WHEN v_last >= (v_today - INTERVAL '1 day')::DATE THEN 'active'
      ELSE 'broken'
    END,

    -- Actividade hoje (ambos os aliases para compatibilidade)
    'active_today',        v_active,
    'active_today_count',  v_active,
    'both_active',         (v_active >= v_total AND v_total >= 2),
    'both_active_today',   (v_active >= v_total AND v_total >= 2),
    'my_checked_in',       v_my_checked_in,
    'member_count',        v_total,
    'total_members',       v_total,

    -- Shields
    'shields_remaining',            v_shields,
    'shield_used_today',            FALSE,
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

NOTIFY pgrst, 'reload schema';

SELECT 'fix shields + longest_streak + get_streak aplicado ✓' AS resultado;
