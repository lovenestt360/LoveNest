-- ══════════════════════════════════════════════════════════════════════
-- FIX: fn_get_or_create_daily_missions_v5 não existe → trigger falha
--      → qualquer INSERT em daily_activity é revertido (rollback)
--      → check-ins, mood, prayer nunca são gravados
-- ══════════════════════════════════════════════════════════════════════

-- ------------------------------------------------------------
-- 1) Garantir tabelas de suporte existem
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.love_missions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title         TEXT NOT NULL,
  description   TEXT,
  emoji         TEXT,
  mission_type  TEXT,
  target_count  INTEGER DEFAULT 1,
  reward_points INTEGER DEFAULT 10,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.couple_daily_missions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_space_id UUID NOT NULL REFERENCES public.couple_spaces(id) ON DELETE CASCADE,
  mission_id      UUID NOT NULL REFERENCES public.love_missions(id) ON DELETE CASCADE,
  assignment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE (couple_space_id, mission_id, assignment_date)
);

CREATE TABLE IF NOT EXISTS public.mission_completions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL,
  mission_id      UUID NOT NULL,
  couple_space_id UUID NOT NULL,
  completed_at    DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, mission_id, completed_at)
);

-- ------------------------------------------------------------
-- 2) Seed básico de missões (só insere se a tabela estiver vazia)
-- ------------------------------------------------------------

INSERT INTO public.love_missions (title, description, emoji, mission_type, target_count, reward_points)
SELECT * FROM (VALUES
  ('Conversar',  'Ambos enviam uma mensagem no chat',  '💬', 'message', 1, 10),
  ('Check-in',   'Ambos fazem o check-in diário',       '✅', 'checkin', 1, 10),
  ('Humor',      'Ambos registam o humor de hoje',      '😊', 'mood',    1,  5),
  ('Oração',     'Ambos partilham uma oração',          '🙏', 'prayer',  1,  5)
) AS v(title, description, emoji, mission_type, target_count, reward_points)
WHERE NOT EXISTS (SELECT 1 FROM public.love_missions LIMIT 1);

-- ------------------------------------------------------------
-- 3) fn_get_or_create_daily_missions_v5
-- ------------------------------------------------------------

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
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  -- Assign 4 missions for today if not yet assigned
  IF NOT EXISTS (
    SELECT 1 FROM public.couple_daily_missions
    WHERE couple_space_id = p_couple_space_id
      AND assignment_date = CURRENT_DATE
  ) THEN
    INSERT INTO public.couple_daily_missions (couple_space_id, mission_id, assignment_date)
    SELECT p_couple_space_id, lm.id, CURRENT_DATE
    FROM public.love_missions lm
    ORDER BY lm.mission_type  -- deterministic order (same missions every day)
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN QUERY
  SELECT
    cdm.id                                AS cdm_id,
    cdm.mission_id,
    lm.title,
    lm.description,
    COALESCE(lm.emoji, '✨')             AS emoji,
    COALESCE(lm.mission_type, 'general') AS mission_type,
    COALESCE(lm.target_count, 1)         AS target_count,
    COALESCE(lm.reward_points, 10)       AS reward_points,
    (
      SELECT LEAST(COUNT(*), lm.target_count::BIGINT)
      FROM public.daily_activity da
      WHERE da.user_id         = v_user_id
        AND da.couple_space_id = p_couple_space_id
        AND da.type            = lm.mission_type
        AND da.activity_date   = CURRENT_DATE
    )                                     AS progress,
    EXISTS (
      SELECT 1 FROM public.mission_completions mc
      WHERE mc.user_id     = v_user_id
        AND mc.mission_id  = cdm.mission_id
        AND mc.completed_at = CURRENT_DATE
    )                                     AS completed
  FROM public.couple_daily_missions cdm
  JOIN public.love_missions lm ON cdm.mission_id = lm.id
  WHERE cdm.couple_space_id = p_couple_space_id
    AND cdm.assignment_date = CURRENT_DATE
  ORDER BY completed ASC, lm.title;
END;
$$;

-- ------------------------------------------------------------
-- 4) checkMissionCompletion
-- ------------------------------------------------------------

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
    SELECT COUNT(*) INTO v_count
    FROM public.daily_activity
    WHERE user_id         = p_user_id
      AND couple_space_id = p_couple_space_id
      AND type            = v_mission.mission_type
      AND activity_date   = CURRENT_DATE;

    IF v_count >= COALESCE(v_mission.target_count, 1) THEN
      INSERT INTO public.mission_completions
        (user_id, mission_id, couple_space_id, completed_at)
      VALUES
        (p_user_id, v_mission.id, p_couple_space_id, CURRENT_DATE)
      ON CONFLICT (user_id, mission_id, completed_at) DO NOTHING;

      -- Award points if mission completed
      INSERT INTO public.points (couple_space_id, total_points)
      VALUES (p_couple_space_id, COALESCE(v_mission.reward_points, 10))
      ON CONFLICT (couple_space_id)
      DO UPDATE SET
        total_points = public.points.total_points + COALESCE(v_mission.reward_points, 10),
        updated_at   = now();
    END IF;
  END LOOP;
END;
$$;

-- ------------------------------------------------------------
-- 5) Trigger function + triggers
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.tr_on_interaction_for_missions()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.fn_get_or_create_daily_missions_v5(NEW.couple_space_id);
  PERFORM public.checkMissionCompletion(NEW.couple_space_id, NEW.user_id, NEW.type);
  RETURN NEW;
END;
$$;

-- daily_activity trigger
DROP TRIGGER IF EXISTS tr_daily_activity_mission_trigger ON public.daily_activity;
CREATE TRIGGER tr_daily_activity_mission_trigger
AFTER INSERT OR UPDATE ON public.daily_activity
FOR EACH ROW EXECUTE FUNCTION public.tr_on_interaction_for_missions();

-- messages trigger (couple_space_id column on messages table)
CREATE OR REPLACE FUNCTION public.tr_on_message_for_missions()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert a daily_activity record for the message (idempotent)
  INSERT INTO public.daily_activity (couple_space_id, user_id, activity_date, type)
  VALUES (NEW.couple_space_id, NEW.user_id, CURRENT_DATE, 'message')
  ON CONFLICT (couple_space_id, user_id, activity_date) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_on_message_mission ON public.messages;
CREATE TRIGGER tr_on_message_mission
AFTER INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.tr_on_message_for_missions();

-- ------------------------------------------------------------
-- 6) Grants
-- ------------------------------------------------------------

GRANT EXECUTE ON FUNCTION public.fn_get_or_create_daily_missions_v5(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.checkMissionCompletion(UUID, UUID, TEXT)  TO authenticated;

NOTIFY pgrst, 'reload schema';
SELECT 'missions trigger restored ✓' AS resultado;
