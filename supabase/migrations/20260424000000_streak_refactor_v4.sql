-- ══════════════════════════════════════════════════════════════════════
-- STREAK REFACTOR V4 — couple_space_id como único identificador
-- Data: 2026-04-24
--
-- REGRA DEFINITIVA:
--   couple_space_id é o único FK para couple_spaces em todo o sistema.
--   couple_id é depreciado e eliminado nesta migration.
--
-- FONTE DE VERDADE:
--   Streak vive em couple_spaces.streak_count + couple_spaces.last_streak_date
--   Atividade diária vive em daily_activity (couple_space_id)
--
-- ORDEM CONTROLADA:
--   STEP 1 — Drop RLS policies, triggers e funções dependentes
--   STEP 2 — Migrar dados + renomear colunas
--   STEP 3 — Recriar RLS com couple_space_id
--   STEP 4 — Reescrever funções core
--   STEP 5 — Reescrever funções de missões
--   STEP 6 — Reescrever funções de ranking e pontos
--   STEP 7 — UNIQUE constraint + DROP tabelas obsoletas
-- ══════════════════════════════════════════════════════════════════════


-- ──────────────────────────────────────────────────────────────────────
-- STEP 1a: Drop triggers sobre daily_activity
-- (impedem o rename de coluna e usam NEW.couple_id)
-- ──────────────────────────────────────────────────────────────────────

DROP TRIGGER IF EXISTS tr_lovestreak_on_activity       ON public.daily_activity;
DROP TRIGGER IF EXISTS tr_daily_activity_mission_trigger ON public.daily_activity;
DROP TRIGGER IF EXISTS tr_on_activity                  ON public.daily_activity;
DROP TRIGGER IF EXISTS tr_interactions_on_activity     ON public.daily_activity;

-- ──────────────────────────────────────────────────────────────────────
-- STEP 1b: Drop RLS policies que referenciam couple_id
-- ──────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Members can insert own activity"  ON public.daily_activity;
DROP POLICY IF EXISTS "Members can view couple activity"  ON public.daily_activity;
DROP POLICY IF EXISTS "Members can view own streak"       ON public.streaks;
DROP POLICY IF EXISTS "Couple members can view streak"    ON public.streaks;

-- ──────────────────────────────────────────────────────────────────────
-- STEP 1c: Drop funções que serão reescritas
-- (DROP antes de recreate evita conflitos de assinatura)
-- ──────────────────────────────────────────────────────────────────────

DROP FUNCTION IF EXISTS public.tr_fn_on_daily_activity();
DROP FUNCTION IF EXISTS public.tr_on_interaction_for_missions();

DROP FUNCTION IF EXISTS public.fn_count_active_members(UUID);
DROP FUNCTION IF EXISTS public.fn_process_streak(UUID);
DROP FUNCTION IF EXISTS public.update_streak(UUID);
DROP FUNCTION IF EXISTS public.log_daily_activity(UUID, TEXT);
DROP FUNCTION IF EXISTS public.log_daily_activity(UUID, UUID);
DROP FUNCTION IF EXISTS public.get_streak(UUID);
DROP FUNCTION IF EXISTS public.get_total_points(UUID);
DROP FUNCTION IF EXISTS public.get_ranking_snapshot(UUID);
DROP FUNCTION IF EXISTS public.fn_get_global_ranking(TEXT);
DROP FUNCTION IF EXISTS public.fn_ensure_monthly_shield_reset(UUID);
DROP FUNCTION IF EXISTS public.buy_monthly_shield(UUID);
DROP FUNCTION IF EXISTS public.fn_buy_loveshield(UUID, INT);
DROP FUNCTION IF EXISTS public.fn_get_shields(UUID);
DROP FUNCTION IF EXISTS public.fn_get_or_create_daily_missions_v5(UUID);

-- checkMissionCompletion mantém assinatura mas corpo vai mudar
DROP FUNCTION IF EXISTS public.checkMissionCompletion(UUID, UUID, TEXT);


-- ══════════════════════════════════════════════════════════════════════
-- STEP 2: Migrar dados + renomear colunas
-- ══════════════════════════════════════════════════════════════════════

-- ──────────────────────────────────────────────────────────────────────
-- STEP 2a: Adicionar streak_count e last_streak_date a couple_spaces
-- ──────────────────────────────────────────────────────────────────────

ALTER TABLE public.couple_spaces
  ADD COLUMN IF NOT EXISTS streak_count     INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_streak_date DATE;

-- ──────────────────────────────────────────────────────────────────────
-- STEP 2b: Migrar dados da tabela streaks → couple_spaces
-- Apenas casais com streak ativo (current_streak > 0)
-- ──────────────────────────────────────────────────────────────────────

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'streaks'
  ) THEN
    UPDATE public.couple_spaces cs
    SET
      streak_count     = COALESCE(s.current_streak, 0),
      last_streak_date = s.last_active_date
    FROM public.streaks s
    WHERE s.couple_id = cs.id
      AND s.current_streak > 0;

    RAISE NOTICE 'Dados migrados de streaks → couple_spaces ✓';
  ELSE
    RAISE NOTICE 'Tabela streaks não existe — migração de dados ignorada';
  END IF;
END $$;

-- ──────────────────────────────────────────────────────────────────────
-- STEP 2c: Renomear daily_activity.couple_id → couple_space_id
-- Gere: drop constraint UNIQUE + FK → rename → re-add FK
-- ──────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  v_has_couple_id    BOOLEAN;
  v_has_space_id     BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'daily_activity'
      AND column_name = 'couple_id'
  ) INTO v_has_couple_id;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'daily_activity'
      AND column_name = 'couple_space_id'
  ) INTO v_has_space_id;

  IF v_has_couple_id AND NOT v_has_space_id THEN
    -- Drop constraints dependentes de couple_id
    ALTER TABLE public.daily_activity
      DROP CONSTRAINT IF EXISTS daily_activity_unique_per_day;
    ALTER TABLE public.daily_activity
      DROP CONSTRAINT IF EXISTS daily_activity_couple_id_fkey;
    ALTER TABLE public.daily_activity
      DROP CONSTRAINT IF EXISTS daily_activity_couple_id_fkey1;

    -- Rename
    ALTER TABLE public.daily_activity
      RENAME COLUMN couple_id TO couple_space_id;

    -- Re-add FK
    ALTER TABLE public.daily_activity
      ADD CONSTRAINT daily_activity_couple_space_id_fkey
      FOREIGN KEY (couple_space_id)
      REFERENCES public.couple_spaces(id) ON DELETE CASCADE;

    RAISE NOTICE 'daily_activity: couple_id → couple_space_id ✓';

  ELSIF v_has_space_id AND NOT v_has_couple_id THEN
    RAISE NOTICE 'daily_activity: couple_space_id já existe — rename ignorado ✓';

  ELSIF v_has_couple_id AND v_has_space_id THEN
    -- Ambas coexistem: copiar dados onde couple_space_id for NULL, depois dropar couple_id
    UPDATE public.daily_activity
    SET couple_space_id = couple_id
    WHERE couple_space_id IS NULL AND couple_id IS NOT NULL;

    ALTER TABLE public.daily_activity
      DROP CONSTRAINT IF EXISTS daily_activity_unique_per_day;
    ALTER TABLE public.daily_activity
      DROP CONSTRAINT IF EXISTS daily_activity_couple_id_fkey;
    ALTER TABLE public.daily_activity
      DROP COLUMN couple_id;

    RAISE NOTICE 'daily_activity: ambas colunas existiam, couple_id eliminada ✓';

  ELSE
    RAISE WARNING 'daily_activity: nem couple_id nem couple_space_id encontradas — verificar schema';
  END IF;
END $$;

-- ──────────────────────────────────────────────────────────────────────
-- STEP 2d: Standardizar points.couple_id → couple_space_id
-- ──────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  v_has_couple_id BOOLEAN;
  v_has_space_id  BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'points'
      AND column_name = 'couple_id'
  ) INTO v_has_couple_id;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'points'
      AND column_name = 'couple_space_id'
  ) INTO v_has_space_id;

  IF v_has_couple_id AND NOT v_has_space_id THEN
    -- Drop UNIQUE antes de renomear
    ALTER TABLE public.points DROP CONSTRAINT IF EXISTS points_couple_id_key;

    ALTER TABLE public.points RENAME COLUMN couple_id TO couple_space_id;

    ALTER TABLE public.points
      ADD CONSTRAINT points_couple_space_id_key UNIQUE (couple_space_id);

    RAISE NOTICE 'points: couple_id → couple_space_id ✓';

  ELSIF v_has_space_id THEN
    RAISE NOTICE 'points: couple_space_id já existe ✓';

  ELSE
    RAISE WARNING 'points: tabela não encontrada ou sem coluna esperada';
  END IF;
END $$;


-- ══════════════════════════════════════════════════════════════════════
-- STEP 3: Recriar RLS sobre daily_activity com couple_space_id
-- ══════════════════════════════════════════════════════════════════════

ALTER TABLE public.daily_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can insert own activity"
ON public.daily_activity FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND public.is_member_of_couple_space(couple_space_id)
);

CREATE POLICY "Members can view couple activity"
ON public.daily_activity FOR SELECT
USING (public.is_member_of_couple_space(couple_space_id));


-- ══════════════════════════════════════════════════════════════════════
-- STEP 4: Funções core do sistema de streak
-- ══════════════════════════════════════════════════════════════════════

-- ──────────────────────────────────────────────────────────────────────
-- 4a: fn_count_active_members — parâmetro renomeado, lógica idêntica
-- ──────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_count_active_members(p_couple_space_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_has_status BOOLEAN;
  v_count      INTEGER;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'members'
      AND column_name  = 'status'
  ) INTO v_has_status;

  IF v_has_status THEN
    SELECT COUNT(*) INTO v_count
    FROM public.members
    WHERE couple_space_id = p_couple_space_id
      AND (status = 'active' OR status IS NULL);
  ELSE
    SELECT COUNT(*) INTO v_count
    FROM public.members
    WHERE couple_space_id = p_couple_space_id;
  END IF;

  RETURN COALESCE(v_count, 0);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;


-- ──────────────────────────────────────────────────────────────────────
-- 4b: update_streak — motor de streak, escreve em couple_spaces
-- Regra: só avança se AMBOS os membros tiverem atividade hoje.
-- Shields (love_shields): auto-ativados quando gap = 1 dia.
-- ──────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.update_streak(p_couple_space_id UUID)
RETURNS VOID AS $$
DECLARE
  v_today       DATE := CURRENT_DATE;
  v_today_count INT;
  v_members     INT;
  v_last_date   DATE;
  v_current     INT;
  v_shields     INT;
  v_gap         INT;
BEGIN
  -- Lock transacional por casal (evita race condition em check-ins simultâneos)
  PERFORM pg_advisory_xact_lock(hashtext(p_couple_space_id::TEXT));

  -- Guardar 1: casal incompleto
  v_members := public.fn_count_active_members(p_couple_space_id);
  IF v_members < 2 THEN RETURN; END IF;

  -- Guardar 2: ambos ativos hoje?
  SELECT COUNT(DISTINCT user_id)
  INTO v_today_count
  FROM public.daily_activity
  WHERE couple_space_id = p_couple_space_id
    AND activity_date   = v_today;

  IF v_today_count < v_members THEN RETURN; END IF;

  -- Ler estado atual com lock da row
  SELECT COALESCE(streak_count, 0), last_streak_date
  INTO v_current, v_last_date
  FROM public.couple_spaces
  WHERE id = p_couple_space_id
  FOR UPDATE;

  IF NOT FOUND THEN RETURN; END IF;

  -- Idempotência: já processado hoje
  IF v_last_date = v_today THEN RETURN; END IF;

  -- Calcular gap (0 = consecutivo, 1 = um dia em falta, >1 = quebra total)
  v_gap := CASE
    WHEN v_last_date IS NULL THEN 0
    ELSE GREATEST((v_today - v_last_date) - 1, 0)
  END;

  -- CASO 1: Consecutivo → incrementa
  IF v_gap = 0 THEN
    UPDATE public.couple_spaces
    SET streak_count     = streak_count + 1,
        last_streak_date = v_today
    WHERE id = p_couple_space_id;

  -- CASO 2: Gap de 1 dia → tenta shield automático
  ELSIF v_gap = 1 THEN
    SELECT COALESCE(shields, 0) INTO v_shields
    FROM public.love_shields
    WHERE couple_space_id = p_couple_space_id;

    IF COALESCE(v_shields, 0) > 0 THEN
      -- Consumir shield
      UPDATE public.love_shields
      SET shields    = GREATEST(shields - 1, 0),
          updated_at = now()
      WHERE couple_space_id = p_couple_space_id;

      -- Manter streak como consecutivo
      UPDATE public.couple_spaces
      SET streak_count     = streak_count + 1,
          last_streak_date = v_today
      WHERE id = p_couple_space_id;
    ELSE
      -- Sem shield → quebra para 1
      UPDATE public.couple_spaces
      SET streak_count     = 1,
          last_streak_date = v_today
      WHERE id = p_couple_space_id;
    END IF;

  -- CASO 3: Gap > 1 → quebra total
  ELSE
    UPDATE public.couple_spaces
    SET streak_count     = 1,
        last_streak_date = v_today
    WHERE id = p_couple_space_id;
  END IF;

  -- Atribuir pontos (+10 por dia completo)
  INSERT INTO public.points (couple_space_id, total_points)
  VALUES (p_couple_space_id, 10)
  ON CONFLICT (couple_space_id)
  DO UPDATE SET
    total_points = public.points.total_points + 10,
    updated_at   = now();

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ──────────────────────────────────────────────────────────────────────
-- 4c: Trigger function + trigger — dispara update_streak após cada INSERT
-- ──────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.tr_fn_on_daily_activity()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM public.update_streak(NEW.couple_space_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER tr_lovestreak_on_activity
AFTER INSERT ON public.daily_activity
FOR EACH ROW EXECUTE FUNCTION public.tr_fn_on_daily_activity();


-- ──────────────────────────────────────────────────────────────────────
-- 4d: log_daily_activity — porta de entrada do frontend
-- Usa auth.uid() (SECURITY DEFINER garante contexto de auth válido)
-- ──────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.log_daily_activity(
  p_couple_space_id UUID,
  p_type            TEXT DEFAULT 'general'
)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_today   DATE := CURRENT_DATE;
  v_active  INT;
  v_total   INT;
BEGIN
  -- Guardar: autenticação
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('status', 'unauthenticated');
  END IF;

  -- Guardar: pertença ao casal
  IF NOT public.is_member_of_couple_space(p_couple_space_id) THEN
    RETURN jsonb_build_object('status', 'invalid_user');
  END IF;

  -- Inserção idempotente — 1 registo por utilizador/dia
  -- Se já existe com tipo 'general', atualiza para tipo mais específico
  INSERT INTO public.daily_activity (couple_space_id, user_id, activity_date, type)
  VALUES (p_couple_space_id, v_user_id, v_today, p_type)
  ON CONFLICT (couple_space_id, user_id, activity_date)
  DO UPDATE SET type = EXCLUDED.type
  WHERE public.daily_activity.type = 'general'
    AND EXCLUDED.type != 'general';

  -- Contar ativos hoje (o trigger já chamou update_streak)
  SELECT COUNT(DISTINCT user_id) INTO v_active
  FROM public.daily_activity
  WHERE couple_space_id = p_couple_space_id
    AND activity_date   = v_today;

  v_total := public.fn_count_active_members(p_couple_space_id);

  RETURN jsonb_build_object(
    'status',             'success',
    'current_streak',     (SELECT streak_count     FROM public.couple_spaces WHERE id = p_couple_space_id),
    'last_streak_date',   (SELECT last_streak_date FROM public.couple_spaces WHERE id = p_couple_space_id),
    'both_active_today',  (v_active >= v_total AND v_total >= 2),
    'active_today_count', v_active,
    'total_members',      v_total
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ──────────────────────────────────────────────────────────────────────
-- 4e: get_streak — leitura completa para o frontend
-- Lê de couple_spaces (sem JOIN em streaks — tabela eliminada)
-- ──────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_streak(p_couple_space_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_today   DATE := CURRENT_DATE;
  v_active  INT  := 0;
  v_total   INT  := 0;
  v_shields INT  := 0;
  v_current INT  := 0;
  v_last    DATE;
BEGIN
  -- Streak da fonte de verdade
  SELECT COALESCE(streak_count, 0), last_streak_date
  INTO v_current, v_last
  FROM public.couple_spaces
  WHERE id = p_couple_space_id;

  -- Atividade de hoje
  SELECT COUNT(DISTINCT user_id) INTO v_active
  FROM public.daily_activity
  WHERE couple_space_id = p_couple_space_id
    AND activity_date   = v_today;

  -- Total de membros
  v_total := public.fn_count_active_members(p_couple_space_id);

  -- Shields disponíveis
  SELECT COALESCE(shields, 0) INTO v_shields
  FROM public.love_shields
  WHERE couple_space_id = p_couple_space_id;

  RETURN jsonb_build_object(
    -- Campos core (aliases para compatibilidade com frontend existente)
    'current',                    v_current,
    'current_streak',             v_current,
    'longest',                    v_current,
    'longest_streak',             v_current,
    'last_date',                  v_last,
    'last_active_date',           v_last,
    'last_streak_date',           v_last,

    -- Status derivado
    'status', CASE
      WHEN v_last IS NULL                                    THEN 'active'
      WHEN v_last >= (v_today - INTERVAL '1 day')::DATE     THEN 'active'
      ELSE 'broken'
    END,

    -- Atividade de hoje
    'both_active_today',          (v_active >= v_total AND v_total >= 2),
    'active_today_count',         v_active,
    'total_members',              v_total,

    -- Shields
    'shields_remaining',          v_shields,
    'shield_used_today',          false,
    'shields_purchased_this_month', 0,

    -- Gamificação
    'progress_percentage',        LEAST(ROUND((v_current::NUMERIC / 28) * 100), 100),
    'streak_at_risk',             (
      v_active < v_total
      AND v_last = (v_today - INTERVAL '1 day')::DATE
    ),
    'days_since_last_activity',   CASE
      WHEN v_last IS NOT NULL THEN (v_today - v_last)
      ELSE NULL
    END
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ══════════════════════════════════════════════════════════════════════
-- STEP 5: Funções de missões — atualizar referências a daily_activity
-- ══════════════════════════════════════════════════════════════════════

-- ──────────────────────────────────────────────────────────────────────
-- 5a: fn_get_or_create_daily_missions_v5
-- Corrige: da.couple_id → da.couple_space_id
-- ──────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_get_or_create_daily_missions_v5(p_couple_space_id UUID)
RETURNS TABLE(
  cdm_id        UUID,
  mission_id    UUID,
  title         TEXT,
  description   TEXT,
  emoji         TEXT,
  mission_type  TEXT,
  target_count  INTEGER,
  reward_points INTEGER,
  progress      BIGINT,
  completed     BOOLEAN
) AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  -- Gerar 3 missões para hoje se ainda não existirem
  IF NOT EXISTS (
    SELECT 1 FROM public.couple_daily_missions
    WHERE couple_space_id = p_couple_space_id
      AND assignment_date = CURRENT_DATE
  ) THEN
    INSERT INTO public.couple_daily_missions (couple_space_id, mission_id, assignment_date)
    SELECT p_couple_space_id, lm.id, CURRENT_DATE
    FROM public.love_missions lm
    WHERE lm.mission_type IS NOT NULL
      AND lm.mission_type != 'general'
    ORDER BY random()
    LIMIT 3
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN QUERY
  SELECT
    cdm.id                               AS cdm_id,
    cdm.mission_id,
    lm.title,
    lm.description,
    COALESCE(lm.emoji, '✨')            AS emoji,
    COALESCE(lm.mission_type, 'general') AS mission_type,
    COALESCE(lm.target_count, 1)         AS target_count,
    COALESCE(lm.reward_points, 20)       AS reward_points,
    (
      SELECT LEAST(COUNT(*), lm.target_count)::BIGINT
      FROM public.daily_activity da
      WHERE da.user_id          = v_user_id
        AND da.couple_space_id  = p_couple_space_id
        AND da.type             = lm.mission_type
        AND da.created_at      >= CURRENT_DATE
        AND da.created_at       < (CURRENT_DATE + INTERVAL '1 day')
    )                                    AS progress,
    EXISTS (
      SELECT 1 FROM public.mission_completions mc
      WHERE mc.user_id     = v_user_id
        AND mc.mission_id  = cdm.mission_id
        AND mc.completed_at = CURRENT_DATE
    )                                    AS completed
  FROM public.couple_daily_missions cdm
  JOIN public.love_missions lm ON cdm.mission_id = lm.id
  WHERE cdm.couple_space_id = p_couple_space_id
    AND cdm.assignment_date = CURRENT_DATE
  ORDER BY completed ASC, lm.title;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ──────────────────────────────────────────────────────────────────────
-- 5b: checkMissionCompletion
-- Corrige: couple_id → couple_space_id em daily_activity
-- ──────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.checkMissionCompletion(
  p_couple_space_id UUID,
  p_user_id         UUID,
  p_action_type     TEXT DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  v_mission       RECORD;
  v_current_count BIGINT;
BEGIN
  FOR v_mission IN
    SELECT lm.id, lm.mission_type, lm.target_count
    FROM public.couple_daily_missions cdm
    JOIN public.love_missions lm ON cdm.mission_id = lm.id
    WHERE cdm.couple_space_id = p_couple_space_id
      AND cdm.assignment_date = CURRENT_DATE
      AND (p_action_type IS NULL OR lm.mission_type = p_action_type)
  LOOP
    SELECT COUNT(*) INTO v_current_count
    FROM public.daily_activity
    WHERE user_id          = p_user_id
      AND couple_space_id  = p_couple_space_id
      AND type             = v_mission.mission_type
      AND created_at      >= CURRENT_DATE
      AND created_at       < (CURRENT_DATE + INTERVAL '1 day');

    IF v_current_count >= COALESCE(v_mission.target_count, 1) THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.mission_completions
        WHERE user_id      = p_user_id
          AND mission_id   = v_mission.id
          AND completed_at = CURRENT_DATE
      ) THEN
        INSERT INTO public.mission_completions
          (user_id, mission_id, couple_space_id, completed_at)
        VALUES
          (p_user_id, v_mission.id, p_couple_space_id, CURRENT_DATE);
      END IF;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ──────────────────────────────────────────────────────────────────────
-- 5c: Trigger de missões — atualizado para NEW.couple_space_id
-- ──────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.tr_on_interaction_for_missions()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM public.fn_get_or_create_daily_missions_v5(NEW.couple_space_id);
  PERFORM public.checkMissionCompletion(NEW.couple_space_id, NEW.user_id, NEW.type);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_daily_activity_mission_trigger ON public.daily_activity;
CREATE TRIGGER tr_daily_activity_mission_trigger
AFTER INSERT ON public.daily_activity
FOR EACH ROW EXECUTE FUNCTION public.tr_on_interaction_for_missions();

-- Trigger de mensagens usa couple_space_id (messages.couple_space_id) — já correto
DROP TRIGGER IF EXISTS tr_on_message_mission ON public.messages;
CREATE TRIGGER tr_on_message_mission
AFTER INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.tr_on_interaction_for_missions();


-- ══════════════════════════════════════════════════════════════════════
-- STEP 6: Funções de ranking, pontos e shields
-- ══════════════════════════════════════════════════════════════════════

-- ──────────────────────────────────────────────────────────────────────
-- 6a: get_total_points
-- ──────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_total_points(p_couple_space_id UUID)
RETURNS INT AS $$
  SELECT COALESCE(total_points, 0)
  FROM public.points
  WHERE couple_space_id = p_couple_space_id;
$$ LANGUAGE sql STABLE SECURITY DEFINER;


-- ──────────────────────────────────────────────────────────────────────
-- 6b: fn_get_global_ranking — sem JOIN em streaks, usa couple_spaces.streak_count
-- ──────────────────────────────────────────────────────────────────────

DROP FUNCTION IF EXISTS public.fn_get_global_ranking(TEXT);

CREATE OR REPLACE FUNCTION public.fn_get_global_ranking(p_rank_type TEXT DEFAULT 'streak')
RETURNS TABLE (
  rank            BIGINT,
  couple_space_id UUID,
  house_name      TEXT,
  house_image     TEXT,
  is_verified     BOOLEAN,
  current_streak  INT,
  total_points    BIGINT
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF p_rank_type = 'points' THEN
    RETURN QUERY
    SELECT
      ROW_NUMBER() OVER (
        ORDER BY COALESCE(p.total_points, 0) DESC,
                 COALESCE(cs.streak_count, 0) DESC
      )::BIGINT                              AS rank,
      cs.id                                  AS couple_space_id,
      COALESCE(cs.house_name, 'Sem nome')    AS house_name,
      cs.house_image,
      COALESCE(cs.is_verified, false)        AS is_verified,
      COALESCE(cs.streak_count, 0)::INT      AS current_streak,
      COALESCE(p.total_points, 0)::BIGINT    AS total_points
    FROM public.couple_spaces cs
    LEFT JOIN public.points p ON p.couple_space_id = cs.id
    ORDER BY COALESCE(p.total_points, 0) DESC
    LIMIT 50;

  ELSE
    RETURN QUERY
    SELECT
      ROW_NUMBER() OVER (
        ORDER BY COALESCE(cs.streak_count, 0) DESC,
                 COALESCE(p.total_points, 0) DESC
      )::BIGINT                              AS rank,
      cs.id                                  AS couple_space_id,
      COALESCE(cs.house_name, 'Sem nome')    AS house_name,
      cs.house_image,
      COALESCE(cs.is_verified, false)        AS is_verified,
      COALESCE(cs.streak_count, 0)::INT      AS current_streak,
      COALESCE(p.total_points, 0)::BIGINT    AS total_points
    FROM public.couple_spaces cs
    LEFT JOIN public.points p ON p.couple_space_id = cs.id
    ORDER BY COALESCE(cs.streak_count, 0) DESC
    LIMIT 50;
  END IF;
END;
$$;


-- ──────────────────────────────────────────────────────────────────────
-- 6c: get_ranking_snapshot — sem JOIN em streaks
-- ──────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_ranking_snapshot(p_couple_space_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_streak_ranking JSONB;
  v_points_ranking JSONB;
  v_my_streak_pos  INT;
  v_my_points_pos  INT;
BEGIN
  -- Ranking por streak (Top 20)
  SELECT jsonb_agg(r ORDER BY r->'rank')
  INTO v_streak_ranking
  FROM (
    SELECT jsonb_build_object(
      'rank',           ROW_NUMBER() OVER (
                          ORDER BY COALESCE(cs.streak_count, 0) DESC,
                                   cs.last_streak_date DESC NULLS LAST),
      'couple_space_id', cs.id,
      'house_name',     cs.house_name,
      'house_image',    cs.house_image,
      'is_verified',    COALESCE(cs.is_verified, false),
      'current_streak', COALESCE(cs.streak_count, 0),
      'total_points',   COALESCE(p.total_points, 0)
    ) AS r
    FROM public.couple_spaces cs
    LEFT JOIN public.points p ON p.couple_space_id = cs.id
    ORDER BY COALESCE(cs.streak_count, 0) DESC, cs.last_streak_date DESC NULLS LAST
    LIMIT 20
  ) sub;

  -- Ranking por pontos (Top 20)
  SELECT jsonb_agg(r ORDER BY r->'rank')
  INTO v_points_ranking
  FROM (
    SELECT jsonb_build_object(
      'rank',           ROW_NUMBER() OVER (
                          ORDER BY COALESCE(p.total_points, 0) DESC,
                                   cs.last_streak_date DESC NULLS LAST),
      'couple_space_id', cs.id,
      'house_name',     cs.house_name,
      'house_image',    cs.house_image,
      'is_verified',    COALESCE(cs.is_verified, false),
      'current_streak', COALESCE(cs.streak_count, 0),
      'total_points',   COALESCE(p.total_points, 0)
    ) AS r
    FROM public.couple_spaces cs
    LEFT JOIN public.points p ON p.couple_space_id = cs.id
    ORDER BY COALESCE(p.total_points, 0) DESC, cs.last_streak_date DESC NULLS LAST
    LIMIT 20
  ) sub;

  -- Posição do meu casal (streak)
  SELECT pos INTO v_my_streak_pos
  FROM (
    SELECT id,
           ROW_NUMBER() OVER (
             ORDER BY COALESCE(streak_count, 0) DESC,
                      last_streak_date DESC NULLS LAST
           ) AS pos
    FROM public.couple_spaces
  ) ranked
  WHERE id = p_couple_space_id;

  -- Posição do meu casal (pontos)
  SELECT pos INTO v_my_points_pos
  FROM (
    SELECT cs.id,
           ROW_NUMBER() OVER (
             ORDER BY COALESCE(p.total_points, 0) DESC,
                      cs.last_streak_date DESC NULLS LAST
           ) AS pos
    FROM public.couple_spaces cs
    LEFT JOIN public.points p ON p.couple_space_id = cs.id
  ) ranked
  WHERE id = p_couple_space_id;

  RETURN jsonb_build_object(
    'streak',        COALESCE(v_streak_ranking, '[]'::jsonb),
    'points',        COALESCE(v_points_ranking, '[]'::jsonb),
    'my_streak_pos', COALESCE(v_my_streak_pos, 0),
    'my_points_pos', COALESCE(v_my_points_pos, 0)
  );
END;
$$;


-- ──────────────────────────────────────────────────────────────────────
-- 6d: fn_buy_loveshield — parâmetro renomeado + lê de points.couple_space_id
-- ──────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_buy_loveshield(
  p_couple_space_id UUID,
  p_cost            INT DEFAULT 200
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_points INT;
BEGIN
  SELECT COALESCE(total_points, 0) INTO v_points
  FROM public.points
  WHERE couple_space_id = p_couple_space_id;

  IF COALESCE(v_points, 0) < p_cost THEN
    RETURN jsonb_build_object(
      'status',         'insufficient_points',
      'current_points', COALESCE(v_points, 0)
    );
  END IF;

  UPDATE public.points
  SET total_points = total_points - p_cost,
      updated_at   = now()
  WHERE couple_space_id = p_couple_space_id;

  INSERT INTO public.love_shields (couple_space_id, shields)
  VALUES (p_couple_space_id, 1)
  ON CONFLICT (couple_space_id)
  DO UPDATE SET
    shields    = LEAST(public.love_shields.shields + 1, 5),
    updated_at = now();

  RETURN jsonb_build_object('status', 'ok');
END;
$$;


-- ──────────────────────────────────────────────────────────────────────
-- 6e: fn_get_shields
-- ──────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_get_shields(p_couple_space_id UUID)
RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_shields INT;
BEGIN
  SELECT COALESCE(shields, 0) INTO v_shields
  FROM public.love_shields
  WHERE couple_space_id = p_couple_space_id;
  RETURN COALESCE(v_shields, 0);
END;
$$;


-- ══════════════════════════════════════════════════════════════════════
-- STEP 7a: UNIQUE constraint em daily_activity
-- Garante 1 registo por utilizador/dia (idempotência do INSERT)
-- ══════════════════════════════════════════════════════════════════════

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema   = 'public'
      AND table_name     = 'daily_activity'
      AND constraint_name = 'daily_activity_unique_per_day'
  ) THEN
    ALTER TABLE public.daily_activity
      ADD CONSTRAINT daily_activity_unique_per_day
      UNIQUE (couple_space_id, user_id, activity_date);
    RAISE NOTICE 'UNIQUE constraint adicionado em daily_activity ✓';
  ELSE
    RAISE NOTICE 'UNIQUE constraint já existe ✓';
  END IF;
END $$;


-- ══════════════════════════════════════════════════════════════════════
-- STEP 7b: DROP tabelas obsoletas
-- Só após todos os passos anteriores estarem corretos.
-- Não usamos CASCADE — se existirem dependências não mapeadas, o erro é visível.
-- ══════════════════════════════════════════════════════════════════════

DO $$
BEGIN
  DROP TABLE IF EXISTS public.streaks;
  RAISE NOTICE 'public.streaks eliminada ✓';
EXCEPTION WHEN others THEN
  RAISE WARNING 'Não foi possível eliminar public.streaks: % — verifique dependências', SQLERRM;
END $$;

DO $$
BEGIN
  DROP TABLE IF EXISTS public.streak_daily_logs;
  RAISE NOTICE 'public.streak_daily_logs eliminada (ou não existia) ✓';
EXCEPTION WHEN others THEN
  RAISE WARNING 'Não foi possível eliminar public.streak_daily_logs: %', SQLERRM;
END $$;


-- ══════════════════════════════════════════════════════════════════════
-- GRANTS
-- ══════════════════════════════════════════════════════════════════════

GRANT EXECUTE ON FUNCTION public.log_daily_activity(UUID, TEXT)          TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_streak(UUID)                        TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_streak(UUID)                     TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_count_active_members(UUID)           TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_total_points(UUID)                  TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_get_global_ranking(TEXT)             TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_ranking_snapshot(UUID)              TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_buy_loveshield(UUID, INT)            TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_get_shields(UUID)                    TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_get_or_create_daily_missions_v5(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.checkMissionCompletion(UUID, UUID, TEXT) TO authenticated;


-- ══════════════════════════════════════════════════════════════════════
-- RELOAD & VERIFICAÇÃO FINAL
-- ══════════════════════════════════════════════════════════════════════

NOTIFY pgrst, 'reload schema';

SELECT
  -- daily_activity deve ter couple_space_id (1) e NÃO ter couple_id (0)
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'daily_activity'
     AND column_name = 'couple_space_id')                AS da_couple_space_id_EXISTS,

  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'daily_activity'
     AND column_name = 'couple_id')                      AS da_couple_id_MUST_BE_0,

  -- couple_spaces deve ter as colunas de streak
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'couple_spaces'
     AND column_name IN ('streak_count', 'last_streak_date'))
                                                          AS cs_streak_columns_MUST_BE_2,

  -- points deve ter couple_space_id
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'points'
     AND column_name = 'couple_space_id')                AS points_couple_space_id_EXISTS,

  -- streaks não deve existir
  (SELECT COUNT(*) FROM information_schema.tables
   WHERE table_schema = 'public' AND table_name = 'streaks')
                                                          AS streaks_table_MUST_BE_0;

SELECT 'Streak Refactor V4 — couple_space_id unificado ✓' AS resultado;
