-- ══════════════════════════════════════════════════════════════════════
-- Fase 2 do LoveNest Progress System (docs/LOVENEST_PROGRESS_SYSTEM.md):
-- LovePoints com histórico (ledger), em vez de só um saldo opaco.
--
-- award_lovepoints() passa a ser a ÚNICA porta de entrada para somar
-- pontos: grava uma linha no extrato E atualiza o saldo em `points`,
-- no mesmo sítio onde isso já acontecia. As duas vias que hoje somam
-- pontos (update_streak: +10/dia; checkMissionCompletion: recompensa
-- por missão) passam a chamar esta função em vez de fazer o INSERT em
-- `points` diretamente — o resto da lógica de cada uma fica intacta.
--
-- Também completa o catálogo love_missions: faltavam "message" (Chat)
-- e "prayer" (Oração), que já existem em src/features/streak/missions.ts
-- mas nunca tinham sido seedados aqui — por isso nunca davam a
-- recompensa extra de missão, só o +10/dia de streak.
-- ══════════════════════════════════════════════════════════════════════

-- ── 1. Tabela de extrato ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.lovepoints_ledger (
  id              uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  couple_space_id uuid        NOT NULL REFERENCES public.couple_spaces(id) ON DELETE CASCADE,
  user_id         uuid,                 -- NULL quando o evento é do casal, não de uma pessoa
  amount          integer     NOT NULL,
  source          text        NOT NULL, -- 'streak_diario' | 'checkin' | 'mood' | 'leitura' | 'plano' | 'message' | 'prayer' | ...
  description     text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lovepoints_ledger_space_date
  ON public.lovepoints_ledger (couple_space_id, created_at DESC);

ALTER TABLE public.lovepoints_ledger ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view their lovepoints ledger" ON public.lovepoints_ledger;
CREATE POLICY "Members can view their lovepoints ledger"
  ON public.lovepoints_ledger FOR SELECT
  USING (public.is_member_of_couple_space(couple_space_id));

-- Sem política de INSERT/UPDATE/DELETE: só award_lovepoints() (SECURITY
-- DEFINER) escreve aqui — ninguém credita pontos diretamente do cliente.

-- ── 2. award_lovepoints — porta única de escrita ─────────────────────

CREATE OR REPLACE FUNCTION public.award_lovepoints(
  p_couple_space_id UUID,
  p_amount          INT,
  p_source          TEXT,
  p_description     TEXT DEFAULT NULL,
  p_user_id         UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.lovepoints_ledger (couple_space_id, user_id, amount, source, description)
  VALUES (p_couple_space_id, p_user_id, p_amount, p_source, p_description);

  INSERT INTO public.points (couple_space_id, total_points)
  VALUES (p_couple_space_id, p_amount)
  ON CONFLICT (couple_space_id)
  DO UPDATE SET total_points = public.points.total_points + p_amount, updated_at = now();
END;
$$;

GRANT EXECUTE ON FUNCTION public.award_lovepoints(UUID, INT, TEXT, TEXT, UUID) TO authenticated;

-- ── 3. update_streak — troca o INSERT direto por award_lovepoints ────
-- Lógica de streak/escudos 100% inalterada; só a atribuição final de
-- pontos passa a ficar registada no extrato.

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
  IF v_members < 1 THEN RETURN; END IF;

  SELECT COALESCE(streak_count, 0), last_streak_date, COALESCE(longest_streak, 0)
  INTO v_current, v_last_date, v_longest
  FROM public.couple_spaces WHERE id = p_couple_space_id FOR UPDATE;
  IF NOT FOUND THEN RETURN; END IF;
  IF v_last_date = v_today THEN RETURN; END IF;

  IF v_current > 0
     AND v_last_date IS NOT NULL
     AND v_last_date < (v_today - INTERVAL '1 day')::DATE
  THEN
    v_gap := GREATEST((v_today - v_last_date) - 1, 0);

    SELECT COALESCE(shields, 0) INTO v_shields
    FROM public.love_shields WHERE couple_space_id = p_couple_space_id;

    IF COALESCE(v_shields, 0) < v_gap THEN
      IF COALESCE(v_shields, 0) > 0 THEN
        UPDATE public.love_shields
        SET shields               = 0,
            last_shield_used_date = v_today,
            updated_at            = now()
        WHERE couple_space_id = p_couple_space_id;
      END IF;

      UPDATE public.couple_spaces
      SET streak_count     = 0,
          last_streak_date = NULL
      WHERE id = p_couple_space_id;

      RETURN;
    END IF;
  END IF;

  SELECT COUNT(DISTINCT user_id) INTO v_today_count
  FROM public.daily_activity
  WHERE couple_space_id = p_couple_space_id AND activity_date = v_today;
  IF v_today_count < v_members THEN RETURN; END IF;

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

  ELSIF v_gap >= 1 THEN
    SELECT COALESCE(shields, 0) INTO v_shields
    FROM public.love_shields WHERE couple_space_id = p_couple_space_id;

    IF COALESCE(v_shields, 0) >= v_gap THEN
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
      UPDATE public.couple_spaces
      SET streak_count     = 1,
          last_streak_date = v_today
      WHERE id = p_couple_space_id;
    END IF;
  END IF;

  -- +10 LovePoints por um dia completo — agora registado no extrato.
  PERFORM public.award_lovepoints(p_couple_space_id, 10, 'streak_diario', 'Chama mantida hoje');

END;
$$;

GRANT EXECUTE ON FUNCTION public.update_streak(UUID) TO authenticated;

-- ── 4. checkMissionCompletion — troca o INSERT direto por award_lovepoints ──
-- Lógica de deteção de missão/membros 100% inalterada.

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
    SELECT lm.id, lm.mission_type, lm.title, lm.target_count,
           COALESCE(lm.reward_points, 10) AS reward_points
    FROM public.couple_daily_missions cdm
    JOIN public.love_missions lm ON cdm.mission_id = lm.id
    WHERE cdm.couple_space_id = p_couple_space_id
      AND cdm.assignment_date = CURRENT_DATE
      AND (p_action_type IS NULL OR lm.mission_type = p_action_type)
  LOOP
    SELECT COUNT(*) INTO v_user_count
    FROM public.daily_activity
    WHERE user_id         = p_user_id
      AND couple_space_id = p_couple_space_id
      AND type            = v_mission.mission_type
      AND activity_date   = CURRENT_DATE;

    IF v_user_count >= COALESCE(v_mission.target_count, 1) THEN

      INSERT INTO public.mission_completions
        (user_id, mission_id, couple_space_id, completed_at)
      VALUES
        (p_user_id, v_mission.id, p_couple_space_id, CURRENT_DATE)
      ON CONFLICT (user_id, mission_id, completed_at) DO NOTHING;

      SELECT COUNT(DISTINCT mc.user_id) INTO v_completed_count
      FROM public.mission_completions mc
      WHERE mc.mission_id      = v_mission.id
        AND mc.couple_space_id = p_couple_space_id
        AND mc.completed_at    = CURRENT_DATE;

      IF v_completed_count >= v_total_members AND v_total_members >= 1 THEN
        v_points := v_mission.reward_points;

        INSERT INTO public.couple_mission_rewards
          (couple_space_id, mission_id, reward_date, points_awarded)
        VALUES
          (p_couple_space_id, v_mission.id, CURRENT_DATE, v_points)
        ON CONFLICT (couple_space_id, mission_id, reward_date) DO NOTHING;

        IF FOUND THEN
          PERFORM public.award_lovepoints(p_couple_space_id, v_points, v_mission.mission_type, v_mission.title);
        END IF;
      END IF;
    END IF;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.checkMissionCompletion(UUID, UUID, TEXT) TO authenticated;

-- ── 5. Completar o catálogo love_missions: faltavam Chat e Oração ────
-- Sem isto, "message" e "prayer" (já usados em missions.ts) nunca
-- davam recompensa extra de missão — só o +10/dia de streak.

INSERT INTO public.love_missions (mission_type, title, description, reward_points, target_count, category)
SELECT 'message', 'Chat', 'Enviem uma mensagem hoje', 10, 1, 'interaction'
WHERE NOT EXISTS (SELECT 1 FROM public.love_missions WHERE mission_type = 'message');

INSERT INTO public.love_missions (mission_type, title, description, reward_points, target_count, category)
SELECT 'prayer', 'Oração', 'Dedica um momento à oração hoje', 5, 1, 'interaction'
WHERE NOT EXISTS (SELECT 1 FROM public.love_missions WHERE mission_type = 'prayer');

NOTIFY pgrst, 'reload schema';
