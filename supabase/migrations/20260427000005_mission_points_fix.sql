-- ══════════════════════════════════════════════════════════════════════
-- FIX: Pontos de missões não eram atribuídos
--
-- Causa: checkMissionCompletion registava conclusão individual mas
--        não atribuía pontos ao casal quando AMBOS completavam.
--
-- Solução:
--   1. Tabela couple_mission_rewards — rastreia quais missões já foram
--      premiadas (idempotência garantida por UNIQUE constraint)
--   2. checkMissionCompletion — atribui pontos quando o casal completa
--      (ambos têm registo em mission_completions para a missão hoje)
--   3. Backfill — premia missões já completas hoje que não foram pagas
-- ══════════════════════════════════════════════════════════════════════

-- ──────────────────────────────────────────────────────────────────────
-- 1) Tabela de controlo de prémios de missões
-- ──────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.couple_mission_rewards (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_space_id UUID NOT NULL REFERENCES public.couple_spaces(id) ON DELETE CASCADE,
  mission_id      UUID NOT NULL REFERENCES public.love_missions(id) ON DELETE CASCADE,
  reward_date     DATE NOT NULL DEFAULT CURRENT_DATE,
  points_awarded  INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE (couple_space_id, mission_id, reward_date)
);

-- ──────────────────────────────────────────────────────────────────────
-- 2) checkMissionCompletion — atribui pontos quando casal completa
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
  v_mission         RECORD;
  v_user_count      BIGINT;
  v_total_members   INT;
  v_completed_count BIGINT;
  v_points          INT;
BEGIN
  SELECT COUNT(*) INTO v_total_members
  FROM public.members
  WHERE couple_space_id = p_couple_space_id;

  FOR v_mission IN
    SELECT lm.id, lm.mission_type, lm.target_count,
           COALESCE(lm.reward_points, 10) AS reward_points
    FROM public.couple_daily_missions cdm
    JOIN public.love_missions lm ON cdm.mission_id = lm.id
    WHERE cdm.couple_space_id = p_couple_space_id
      AND cdm.assignment_date = CURRENT_DATE
      AND (p_action_type IS NULL OR lm.mission_type = p_action_type)
  LOOP
    -- Quantas vezes o utilizador actual fez esta actividade hoje
    SELECT COUNT(*) INTO v_user_count
    FROM public.daily_activity
    WHERE user_id         = p_user_id
      AND couple_space_id = p_couple_space_id
      AND type            = v_mission.mission_type
      AND activity_date   = CURRENT_DATE;

    -- Utilizador completou a sua parte da missão?
    IF v_user_count >= COALESCE(v_mission.target_count, 1) THEN

      -- Registar conclusão individual (idempotente)
      INSERT INTO public.mission_completions
        (user_id, mission_id, couple_space_id, completed_at)
      VALUES
        (p_user_id, v_mission.id, p_couple_space_id, CURRENT_DATE)
      ON CONFLICT (user_id, mission_id, completed_at) DO NOTHING;

      -- Quantos membros distintos completaram esta missão hoje?
      SELECT COUNT(DISTINCT mc.user_id) INTO v_completed_count
      FROM public.mission_completions mc
      WHERE mc.mission_id      = v_mission.id
        AND mc.couple_space_id = p_couple_space_id
        AND mc.completed_at    = CURRENT_DATE;

      -- Se TODOS os membros completaram E pontos ainda não foram atribuídos
      IF v_completed_count >= v_total_members AND v_total_members >= 2 THEN
        v_points := v_mission.reward_points;

        -- Tentar registar o prémio (falha silenciosamente se já existir)
        INSERT INTO public.couple_mission_rewards
          (couple_space_id, mission_id, reward_date, points_awarded)
        VALUES
          (p_couple_space_id, v_mission.id, CURRENT_DATE, v_points)
        ON CONFLICT (couple_space_id, mission_id, reward_date) DO NOTHING;

        -- Só atribui pontos se o INSERT acima foi efectivo (não conflito)
        IF FOUND THEN
          INSERT INTO public.points (couple_space_id, total_points)
          VALUES (p_couple_space_id, v_points)
          ON CONFLICT (couple_space_id)
          DO UPDATE SET
            total_points = public.points.total_points + v_points,
            updated_at   = now();
        END IF;
      END IF;
    END IF;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.checkMissionCompletion(UUID, UUID, TEXT) TO authenticated;

-- ──────────────────────────────────────────────────────────────────────
-- 3) Backfill — premiar missões já completas hoje que não foram pagas
-- ──────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  v_rec    RECORD;
  v_points INT;
BEGIN
  FOR v_rec IN
    -- Missões onde TODOS os membros já completaram hoje
    -- mas que ainda não têm registo em couple_mission_rewards
    SELECT
      mc.couple_space_id,
      mc.mission_id,
      lm.reward_points,
      COUNT(DISTINCT mc.user_id) AS completed_members,
      (SELECT COUNT(*) FROM public.members m WHERE m.couple_space_id = mc.couple_space_id) AS total_members
    FROM public.mission_completions mc
    JOIN public.love_missions lm ON lm.id = mc.mission_id
    WHERE mc.completed_at = CURRENT_DATE
      AND NOT EXISTS (
        SELECT 1 FROM public.couple_mission_rewards r
        WHERE r.couple_space_id = mc.couple_space_id
          AND r.mission_id      = mc.mission_id
          AND r.reward_date     = CURRENT_DATE
      )
    GROUP BY mc.couple_space_id, mc.mission_id, lm.reward_points
    HAVING COUNT(DISTINCT mc.user_id) >= (
      SELECT COUNT(*) FROM public.members m WHERE m.couple_space_id = mc.couple_space_id
    )
  LOOP
    IF v_rec.total_members >= 2 THEN
      v_points := COALESCE(v_rec.reward_points, 10);

      INSERT INTO public.couple_mission_rewards
        (couple_space_id, mission_id, reward_date, points_awarded)
      VALUES
        (v_rec.couple_space_id, v_rec.mission_id, CURRENT_DATE, v_points)
      ON CONFLICT (couple_space_id, mission_id, reward_date) DO NOTHING;

      IF FOUND THEN
        INSERT INTO public.points (couple_space_id, total_points)
        VALUES (v_rec.couple_space_id, v_points)
        ON CONFLICT (couple_space_id)
        DO UPDATE SET
          total_points = public.points.total_points + v_points,
          updated_at   = now();

        RAISE NOTICE 'Backfill: % pts para casal % missão %',
          v_points, v_rec.couple_space_id, v_rec.mission_id;
      END IF;
    END IF;
  END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';
SELECT 'mission points fix + backfill applied ✓' AS resultado;
