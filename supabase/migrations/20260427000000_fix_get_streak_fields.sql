-- ══════════════════════════════════════════════════════════════════════
-- FIX: get_streak — field names unificados + my_checked_in
--
-- Problema: V4 retornava both_active_today/active_today_count
--           Frontend lê both_active/active_today → sempre 0/false
--           Resultado: UI nunca resetava correctamente ao mudar de dia
--
-- Fix: retornar ambos os aliases + adicionar my_checked_in
--      O polling/day-change detection foi adicionado no frontend.
-- ══════════════════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS public.get_streak(UUID);

CREATE OR REPLACE FUNCTION public.get_streak(p_couple_space_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today         DATE    := CURRENT_DATE;
  v_current       INT     := 0;
  v_last          DATE;
  v_active        INT     := 0;
  v_total         INT     := 0;
  v_shields       INT     := 0;
  v_my_checked_in BOOLEAN := FALSE;
BEGIN
  -- Fonte de verdade: streak_count e last_streak_date
  SELECT COALESCE(streak_count, 0), last_streak_date
  INTO v_current, v_last
  FROM public.couple_spaces
  WHERE id = p_couple_space_id;

  -- Quantos utilizadores distintos fizeram actividade hoje (UTC)
  SELECT COUNT(DISTINCT user_id)
  INTO v_active
  FROM public.daily_activity
  WHERE couple_space_id = p_couple_space_id
    AND activity_date   = v_today;

  -- O utilizador actual fez actividade hoje?
  SELECT EXISTS (
    SELECT 1 FROM public.daily_activity
    WHERE couple_space_id = p_couple_space_id
      AND user_id         = auth.uid()
      AND activity_date   = v_today
  ) INTO v_my_checked_in;

  -- Total de membros activos
  v_total := public.fn_count_active_members(p_couple_space_id);

  -- Shields disponíveis
  SELECT COALESCE(shields, 0)
  INTO v_shields
  FROM public.love_shields
  WHERE couple_space_id = p_couple_space_id;

  RETURN jsonb_build_object(
    -- ── Streak core ───────────────────────────────────────────────
    'streak',             v_current,   -- lido por buildState como raw.streak
    'current',            v_current,
    'current_streak',     v_current,
    'longest',            v_current,
    'longest_streak',     v_current,
    'last_date',          v_last,
    'last_active_date',   v_last,
    'last_streak_date',   v_last,

    -- ── Status ────────────────────────────────────────────────────
    'status', CASE
      WHEN v_last IS NULL                                    THEN 'active'
      WHEN v_last >= (v_today - INTERVAL '1 day')::DATE     THEN 'active'
      ELSE 'broken'
    END,

    -- ── Actividade de hoje — AMBOS os nomes (aliases) ─────────────
    -- Frontend lê: raw.active_today, raw.both_active, raw.my_checked_in
    -- V4 retornava: active_today_count, both_active_today  ← incompatível
    'active_today',        v_active,
    'active_today_count',  v_active,              -- alias de compatibilidade
    'both_active',         (v_active >= v_total AND v_total >= 2),
    'both_active_today',   (v_active >= v_total AND v_total >= 2),  -- alias
    'my_checked_in',       v_my_checked_in,
    'member_count',        v_total,
    'total_members',       v_total,

    -- ── Shields ───────────────────────────────────────────────────
    'shields_remaining',             v_shields,
    'shield_used_today',             FALSE,
    'shields_purchased_this_month',  0,

    -- ── Gamificação ───────────────────────────────────────────────
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

SELECT 'get_streak field fix applied ✓' AS resultado;
