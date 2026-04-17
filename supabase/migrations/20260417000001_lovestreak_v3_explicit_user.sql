-- ══════════════════════════════════════════════════════════════════════
-- LOVESTREAK V3 — Explicit User ID + Points System
-- Problema resolvido: auth.uid() era unreliable em contexto RPC.
-- Solução: p_user_id sempre passado explicitamente pelo frontend.
-- Compatível com tabelas existentes. Sem renomear colunas.
-- ══════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────
-- STEP 1: Remover trigger que duplicava o processamento
-- (o novo log_daily_activity chama update_streak diretamente)
-- ─────────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS tr_lovestreak_on_activity ON public.daily_activity;
DROP FUNCTION IF EXISTS public.log_daily_activity(UUID, TEXT);

-- ─────────────────────────────────────────────────────────────
-- STEP 2: Tabela de pontos (nova)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.points (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id    UUID UNIQUE NOT NULL,
  total_points INT  NOT NULL DEFAULT 0,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Inicializar pontos para casais existentes
INSERT INTO public.points (couple_id, total_points)
SELECT cs.id, 0
FROM public.couple_spaces cs
ON CONFLICT (couple_id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- STEP 3: update_streak — motor interno
-- Chamado por log_daily_activity após INSERT em daily_activity.
-- Usa advisory lock por casal para evitar race conditions.
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.update_streak(p_couple_id UUID)
RETURNS VOID AS $$
DECLARE
  v_today         DATE := CURRENT_DATE;
  v_today_count   INT;
  v_member_count  INT;
  v_last_date     DATE;
  v_current       INT;
  v_longest       INT;
BEGIN
  -- Concorrência: lock transaccional por casal
  PERFORM pg_advisory_xact_lock(hashtext(p_couple_id::TEXT));

  -- Membros ativos
  v_member_count := public.fn_count_active_members(p_couple_id);
  IF v_member_count < 2 THEN RETURN; END IF;

  -- Utilizadores ativos hoje
  SELECT COUNT(DISTINCT user_id)
  INTO v_today_count
  FROM public.daily_activity
  WHERE couple_id = p_couple_id AND activity_date = v_today;

  IF v_today_count < v_member_count THEN RETURN; END IF;

  -- Ler estado atual com lock da row
  SELECT last_active_date, current_streak, longest_streak
  INTO v_last_date, v_current, v_longest
  FROM public.streaks
  WHERE couple_id = p_couple_id
  FOR UPDATE;

  IF NOT FOUND THEN
    -- Primeiro streak deste casal
    INSERT INTO public.streaks
      (couple_id, current_streak, longest_streak, last_active_date, status, updated_at)
    VALUES
      (p_couple_id, 1, 1, v_today, 'active', now())
    ON CONFLICT (couple_id) DO NOTHING;

    -- +10 pontos
    INSERT INTO public.points (couple_id, total_points)
    VALUES (p_couple_id, 10)
    ON CONFLICT (couple_id)
    DO UPDATE SET total_points = public.points.total_points + 10, updated_at = now();
    RETURN;
  END IF;

  -- Idempotência: já processado hoje
  IF v_last_date = v_today THEN RETURN; END IF;

  -- Lógica de streak
  IF v_last_date = (v_today - INTERVAL '1 day')::DATE THEN
    v_current := COALESCE(v_current, 0) + 1;
    v_longest  := GREATEST(COALESCE(v_longest, 0), v_current);

    UPDATE public.streaks
    SET current_streak = v_current, longest_streak = v_longest,
        last_active_date = v_today, status = 'active', updated_at = now()
    WHERE couple_id = p_couple_id;
  ELSE
    -- Gap: reset para 1
    v_longest := GREATEST(COALESCE(v_longest, 0), 1);

    UPDATE public.streaks
    SET current_streak = 1, longest_streak = v_longest,
        last_active_date = v_today, status = 'broken', updated_at = now()
    WHERE couple_id = p_couple_id;
  END IF;

  -- +10 pontos por dia completo
  INSERT INTO public.points (couple_id, total_points)
  VALUES (p_couple_id, 10)
  ON CONFLICT (couple_id)
  DO UPDATE SET total_points = public.points.total_points + 10, updated_at = now();

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─────────────────────────────────────────────────────────────
-- STEP 4: log_daily_activity — porta de entrada
-- Recebe p_user_id EXPLICITAMENTE (nunca usa auth.uid()).
-- Valida membership → insere activity → chama update_streak.
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.log_daily_activity(
  p_couple_id UUID,
  p_user_id   UUID
)
RETURNS JSONB AS $$
DECLARE
  v_is_member INT;
  v_today     DATE := CURRENT_DATE;
  v_active    INT;
  v_total     INT;
  v_result    JSONB;
BEGIN
  -- Validar membership
  SELECT COUNT(*) INTO v_is_member
  FROM public.members
  WHERE couple_space_id = p_couple_id AND user_id = p_user_id;

  IF v_is_member = 0 THEN
    RETURN jsonb_build_object(
      'status',         'invalid_user',
      'current_streak', 0,
      'longest_streak', 0,
      'both_active_today', false
    );
  END IF;

  -- Inserção idempotente (1 registo por user/dia)
  INSERT INTO public.daily_activity (couple_id, user_id, activity_date, type)
  VALUES (p_couple_id, p_user_id, v_today, 'checkin')
  ON CONFLICT (couple_id, user_id, activity_date) DO NOTHING;

  -- Processar streak
  PERFORM public.update_streak(p_couple_id);

  -- Actividade de hoje para resposta
  SELECT COUNT(DISTINCT da.user_id) INTO v_active
  FROM public.daily_activity da
  WHERE da.couple_id = p_couple_id AND da.activity_date = v_today;

  v_total := public.fn_count_active_members(p_couple_id);

  -- Resposta rica
  SELECT jsonb_build_object(
    'status',            'ok',
    'current_streak',    COALESCE(s.current_streak, 0),
    'longest_streak',    COALESCE(s.longest_streak, 0),
    'last_date',         s.last_active_date,
    'both_active_today', (v_active >= v_total AND v_total >= 2),
    'active_today_count', v_active,
    'total_members',     v_total,
    'updated_at',        s.updated_at
  )
  INTO v_result
  FROM public.streaks s
  WHERE s.couple_id = p_couple_id;

  RETURN COALESCE(v_result, jsonb_build_object(
    'status', 'ok', 'current_streak', 0, 'longest_streak', 0,
    'both_active_today', (v_active >= v_total AND v_total >= 2),
    'updated_at', now()
  ));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─────────────────────────────────────────────────────────────
-- STEP 5: get_streak — leitura rica para o frontend
-- Retorna todos os campos que a UI precisa.
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_streak(p_couple_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_result  JSONB;
  v_today   DATE := CURRENT_DATE;
  v_active  INT;
  v_total   INT;
BEGIN
  SELECT COUNT(DISTINCT user_id) INTO v_active
  FROM public.daily_activity
  WHERE couple_id = p_couple_id AND activity_date = v_today;

  v_total := public.fn_count_active_members(p_couple_id);

  SELECT jsonb_build_object(
    -- Campos core (novos nomes + aliases)
    'current',                  COALESCE(s.current_streak, 0),
    'current_streak',           COALESCE(s.current_streak, 0),
    'longest',                  COALESCE(s.longest_streak, 0),
    'longest_streak',           COALESCE(s.longest_streak, 0),
    'last_date',                s.last_active_date,
    'last_active_date',         s.last_active_date,
    'status',                   COALESCE(s.status, 'active'),
    'updated_at',               s.updated_at,
    -- Atividade de hoje
    'both_active_today',        (v_active >= v_total AND v_total >= 2),
    'active_today_count',       v_active,
    'total_members',            v_total,
    -- Gamificação
    'progress_percentage',      LEAST(ROUND((COALESCE(s.current_streak, 0)::NUMERIC / 28) * 100), 100),
    'streak_at_risk',           (
      v_active < v_total
      AND s.last_active_date = (v_today - INTERVAL '1 day')::DATE
    ),
    'days_since_last_activity', CASE
      WHEN s.last_active_date IS NOT NULL THEN (v_today - s.last_active_date)
      ELSE NULL
    END
  )
  INTO v_result
  FROM public.streaks s
  WHERE s.couple_id = p_couple_id;

  RETURN COALESCE(v_result, jsonb_build_object(
    'current', 0, 'current_streak', 0, 'longest', 0, 'longest_streak', 0,
    'status', 'active', 'both_active_today', false,
    'active_today_count', v_active, 'total_members', v_total,
    'progress_percentage', 0, 'streak_at_risk', false,
    'days_since_last_activity', NULL, 'last_date', NULL, 'last_active_date', NULL
  ));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─────────────────────────────────────────────────────────────
-- VERIFICAÇÃO FINAL
-- ─────────────────────────────────────────────────────────────
NOTIFY pgrst, 'reload schema';

SELECT
  'log_daily_activity(UUID,UUID)' AS func,
  EXISTS (
    SELECT 1 FROM information_schema.routines
    WHERE routine_schema = 'public'
      AND routine_name = 'log_daily_activity'
  ) AS exists
UNION ALL
SELECT
  'update_streak(UUID)', EXISTS (
    SELECT 1 FROM information_schema.routines
    WHERE routine_schema = 'public'
      AND routine_name = 'update_streak'
  )
UNION ALL
SELECT
  'points table', EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'points'
  );

SELECT 'LoveStreak V3 — Explicit User ID aplicado ✓' AS resultado;
