-- ══════════════════════════════════════════════════════════════════════
-- COMPREHENSIVE FIX — 2026-04-27
--
-- Problemas identificados por auditoria:
--   A) mission_completions sem UNIQUE constraint
--      → checkMissionCompletion ON CONFLICT falha → rollback do check-in
--   B) tr_on_message_for_missions usa NEW.user_id
--      → messages tem sender_user_id → "record new has no field user_id"
--      → também ON CONFLICT com 3 colunas (constraint tem 4)
--   C) tr_lovestreak_on_activity foi dropado pelo V5
--      → update_streak não existe → streak nunca avança
--
-- Ordem de execução:
--   1. UNIQUE constraint em mission_completions
--   2. update_streak function (motor de streak)
--   3. Trigger de streak em daily_activity
--   4. fix tr_on_message_for_missions (sender_user_id + ON CONFLICT 4 cols)
-- ══════════════════════════════════════════════════════════════════════

-- ──────────────────────────────────────────────────────────────────────
-- A) UNIQUE constraint em mission_completions
-- ──────────────────────────────────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.mission_completions'::regclass
      AND contype  = 'u'
  ) THEN
    ALTER TABLE public.mission_completions
      ADD CONSTRAINT mission_completions_user_mission_date_key
      UNIQUE (user_id, mission_id, completed_at);
    RAISE NOTICE 'UNIQUE constraint adicionado em mission_completions ✓';
  ELSE
    RAISE NOTICE 'mission_completions já tem UNIQUE constraint ✓';
  END IF;
END $$;

-- ──────────────────────────────────────────────────────────────────────
-- B) update_streak — motor de streak, escreve em couple_spaces
-- Regra: avança apenas quando TODOS os membros tiverem actividade hoje.
-- Usa advisory lock para evitar race condition em check-ins simultâneos.
-- ──────────────────────────────────────────────────────────────────────

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
  v_shields     INT;
  v_gap         INT;
BEGIN
  -- Lock transacional por casal (evita race condition)
  PERFORM pg_advisory_xact_lock(hashtext(p_couple_space_id::TEXT));

  -- Quantos membros activos tem o casal?
  SELECT COUNT(*) INTO v_members
  FROM public.members
  WHERE couple_space_id = p_couple_space_id;

  IF v_members < 2 THEN RETURN; END IF;

  -- Quantos utilizadores distintos fizeram actividade hoje?
  SELECT COUNT(DISTINCT user_id) INTO v_today_count
  FROM public.daily_activity
  WHERE couple_space_id = p_couple_space_id
    AND activity_date   = v_today;

  IF v_today_count < v_members THEN RETURN; END IF;

  -- Ler estado actual com lock da row
  SELECT COALESCE(streak_count, 0), last_streak_date
  INTO v_current, v_last_date
  FROM public.couple_spaces
  WHERE id = p_couple_space_id
  FOR UPDATE;

  IF NOT FOUND THEN RETURN; END IF;

  -- Idempotência: já processado hoje → não avança
  IF v_last_date = v_today THEN RETURN; END IF;

  -- Gap: 0 = consecutivo, 1 = um dia em falta, >1 = quebra total
  v_gap := CASE
    WHEN v_last_date IS NULL THEN 0
    ELSE GREATEST((v_today - v_last_date) - 1, 0)
  END;

  IF v_gap = 0 THEN
    -- Consecutivo: incrementa
    UPDATE public.couple_spaces
    SET streak_count     = streak_count + 1,
        last_streak_date = v_today
    WHERE id = p_couple_space_id;

  ELSIF v_gap = 1 THEN
    -- Gap de 1 dia: tenta usar LoveShield automaticamente
    SELECT COALESCE(shields, 0) INTO v_shields
    FROM public.love_shields
    WHERE couple_space_id = p_couple_space_id;

    IF COALESCE(v_shields, 0) > 0 THEN
      UPDATE public.love_shields
      SET shields    = GREATEST(shields - 1, 0),
          updated_at = now()
      WHERE couple_space_id = p_couple_space_id;

      UPDATE public.couple_spaces
      SET streak_count     = streak_count + 1,
          last_streak_date = v_today
      WHERE id = p_couple_space_id;
    ELSE
      UPDATE public.couple_spaces
      SET streak_count     = 1,
          last_streak_date = v_today
      WHERE id = p_couple_space_id;
    END IF;

  ELSE
    -- Gap > 1: quebra total
    UPDATE public.couple_spaces
    SET streak_count     = 1,
        last_streak_date = v_today
    WHERE id = p_couple_space_id;
  END IF;

  -- Atribuir +10 pontos por dia completo
  INSERT INTO public.points (couple_space_id, total_points)
  VALUES (p_couple_space_id, 10)
  ON CONFLICT (couple_space_id)
  DO UPDATE SET
    total_points = public.points.total_points + 10,
    updated_at   = now();

END;
$$;

GRANT EXECUTE ON FUNCTION public.update_streak(UUID) TO authenticated;

-- ──────────────────────────────────────────────────────────────────────
-- C) Trigger de streak em daily_activity
-- Chama update_streak após cada INSERT
-- ──────────────────────────────────────────────────────────────────────

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

-- ──────────────────────────────────────────────────────────────────────
-- D) tr_on_message_for_missions — corrigir 2 bugs:
--    1. NEW.user_id → NEW.sender_user_id (coluna real na tabela messages)
--    2. ON CONFLICT 3 cols → 4 cols (couple_space_id, user_id, activity_date, type)
-- ──────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.tr_on_message_for_missions()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- messages.sender_user_id é o campo correcto (não user_id)
  -- Constraint em daily_activity: (couple_space_id, user_id, activity_date, type)
  INSERT INTO public.daily_activity (couple_space_id, user_id, activity_date, type)
  VALUES (NEW.couple_space_id, NEW.sender_user_id, CURRENT_DATE, 'message')
  ON CONFLICT (couple_space_id, user_id, activity_date, type) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Recriar trigger (já existe mas aponta para função actualizada)
DROP TRIGGER IF EXISTS tr_on_message_mission ON public.messages;
CREATE TRIGGER tr_on_message_mission
AFTER INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.tr_on_message_for_missions();

-- ──────────────────────────────────────────────────────────────────────
-- E) checkMissionCompletion — garantir ON CONFLICT correcto
-- ──────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.checkMissionCompletion(
  p_couple_space_id UUID,
  p_user_id         UUID,
  p_action_type     TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_mission RECORD;
  v_count   BIGINT;
BEGIN
  FOR v_mission IN
    SELECT lm.id, lm.mission_type, lm.target_count, lm.reward_points
    FROM public.couple_daily_missions cdm
    JOIN public.love_missions lm ON cdm.mission_id = lm.id
    WHERE cdm.couple_space_id = p_couple_space_id
      AND cdm.assignment_date = CURRENT_DATE
      AND (p_action_type IS NULL OR lm.mission_type = p_action_type)
  LOOP
    -- Contar actividades do tipo da missão hoje
    SELECT COUNT(*) INTO v_count
    FROM public.daily_activity
    WHERE user_id         = p_user_id
      AND couple_space_id = p_couple_space_id
      AND type            = v_mission.mission_type
      AND activity_date   = CURRENT_DATE;

    IF v_count >= COALESCE(v_mission.target_count, 1) THEN
      -- Registar conclusão (idempotente)
      INSERT INTO public.mission_completions
        (user_id, mission_id, couple_space_id, completed_at)
      VALUES
        (p_user_id, v_mission.id, p_couple_space_id, CURRENT_DATE)
      ON CONFLICT (user_id, mission_id, completed_at) DO NOTHING;
    END IF;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.checkMissionCompletion(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_streak(UUID) TO authenticated;

NOTIFY pgrst, 'reload schema';

SELECT 'comprehensive fix applied ✓' AS resultado,
       'A: mission_completions UNIQUE | B: update_streak restored | C: streak trigger | D: message trigger sender_user_id' AS fixes;
