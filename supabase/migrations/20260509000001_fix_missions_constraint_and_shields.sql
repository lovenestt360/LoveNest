-- ══════════════════════════════════════════════════════════════════════
-- FIX 2026-05-09
--
-- Problemas:
--   A) daily_activity UNIQUE constraint tem 3 colunas
--      (couple_space_id, user_id, activity_date)
--      → log_daily_activity e triggers usam ON CONFLICT com 4 colunas
--        (+ type) → erro em runtime quando já existe uma actividade
--        do dia → só 1 tipo por utilizador por dia é gravado
--      → missões nunca contam (message + checkin + mood não coexistem)
--
--   B) update_streak só consome shields para gap = 1
--      → gap de 2+ dias: shields ficam na tabela sem ser usados
--      → utilizador perde streak mas escudos ficam "ativos" sem sentido
--
-- Fixes:
--   1. Mudar constraint para 4 colunas (+ type) — idempotente
--   2. update_streak consome shields para qualquer gap (≥1)
-- ══════════════════════════════════════════════════════════════════════


-- ── A) Fix UNIQUE constraint em daily_activity ────────────────────────
--
-- Se o constraint existente tem 3 colunas, dropar e recriar com 4.
-- Se já tem 4 colunas, não faz nada.

DO $$
DECLARE
  v_col_count INTEGER := 0;
BEGIN
  -- Contar quantas colunas tem o constraint actual
  SELECT array_length(i.indkey::smallint[], 1)
  INTO v_col_count
  FROM pg_constraint c
  JOIN pg_index i ON i.indexrelid = c.conindid
  WHERE c.conname   = 'daily_activity_unique_per_day'
    AND c.conrelid  = 'public.daily_activity'::regclass
  LIMIT 1;

  IF v_col_count IS NULL THEN
    -- Constraint não existe — criar com 4 colunas
    ALTER TABLE public.daily_activity
      ADD CONSTRAINT daily_activity_unique_per_day
      UNIQUE (couple_space_id, user_id, activity_date, type);
    RAISE NOTICE 'Constraint 4-col criado ✓';

  ELSIF v_col_count = 3 THEN
    -- Constraint antigo de 3 colunas — dropar e recriar
    ALTER TABLE public.daily_activity
      DROP CONSTRAINT daily_activity_unique_per_day;

    ALTER TABLE public.daily_activity
      ADD CONSTRAINT daily_activity_unique_per_day
      UNIQUE (couple_space_id, user_id, activity_date, type);
    RAISE NOTICE 'Constraint 3-col → 4-col migrado ✓';

  ELSE
    RAISE NOTICE 'Constraint já tem % colunas — sem alteração ✓', v_col_count;
  END IF;
END $$;


-- ── B) update_streak — consumir shields para qualquer gap ─────────────
--
-- Antes: shields só consumidos quando gap = 1.
-- Depois: shields consumidos para qualquer gap (≥ 1).
--   - Se shields >= gap: usa exatamente gap shields → streak mantido
--   - Se shields < gap: usa todos os shields restantes → streak quebra para 1
--   - Se shields = 0: streak quebra para 1 (sem shields)
--
-- Regra: os shields são sempre consumidos quando o streak quebra,
-- mesmo que não sejam suficientes para cobrir o gap total.

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
  -- Lock transacional por casal (evita race condition em check-ins simultâneos)
  PERFORM pg_advisory_xact_lock(hashtext(p_couple_space_id::TEXT));

  -- Guardar: casal tem 2+ membros
  SELECT COUNT(*) INTO v_members
  FROM public.members
  WHERE couple_space_id = p_couple_space_id;

  IF v_members < 2 THEN RETURN; END IF;

  -- Guardar: ambos activos hoje?
  SELECT COUNT(DISTINCT user_id) INTO v_today_count
  FROM public.daily_activity
  WHERE couple_space_id = p_couple_space_id
    AND activity_date   = v_today;

  IF v_today_count < v_members THEN RETURN; END IF;

  -- Ler estado actual com lock da row
  SELECT COALESCE(streak_count, 0), last_streak_date, COALESCE(longest_streak, 0)
  INTO v_current, v_last_date, v_longest
  FROM public.couple_spaces
  WHERE id = p_couple_space_id
  FOR UPDATE;

  IF NOT FOUND THEN RETURN; END IF;

  -- Idempotência: já processado hoje
  IF v_last_date = v_today THEN RETURN; END IF;

  -- Gap em dias (0 = consecutivo, 1 = um dia em falta, >1 = múltiplos dias)
  v_gap := CASE
    WHEN v_last_date IS NULL THEN 0
    ELSE GREATEST((v_today - v_last_date) - 1, 0)
  END;

  IF v_gap = 0 THEN
    -- Consecutivo: incrementa normalmente
    v_new_streak := v_current + 1;
    UPDATE public.couple_spaces
    SET streak_count     = v_new_streak,
        last_streak_date = v_today,
        longest_streak   = GREATEST(COALESCE(longest_streak, 0), v_new_streak)
    WHERE id = p_couple_space_id;

  ELSIF v_gap >= 1 THEN
    -- Dia(s) em falta: tentar usar shields
    SELECT COALESCE(shields, 0) INTO v_shields
    FROM public.love_shields
    WHERE couple_space_id = p_couple_space_id;

    IF COALESCE(v_shields, 0) >= v_gap THEN
      -- Shields suficientes para cobrir todos os dias em falta
      UPDATE public.love_shields
      SET shields    = GREATEST(shields - v_gap, 0),
          updated_at = now()
      WHERE couple_space_id = p_couple_space_id;

      v_new_streak := v_current + 1;
      UPDATE public.couple_spaces
      SET streak_count     = v_new_streak,
          last_streak_date = v_today,
          longest_streak   = GREATEST(COALESCE(longest_streak, 0), v_new_streak)
      WHERE id = p_couple_space_id;

    ELSE
      -- Shields insuficientes: consumir todos e quebrar streak
      IF COALESCE(v_shields, 0) > 0 THEN
        UPDATE public.love_shields
        SET shields    = 0,
            updated_at = now()
        WHERE couple_space_id = p_couple_space_id;
      END IF;

      UPDATE public.couple_spaces
      SET streak_count     = 1,
          last_streak_date = v_today
          -- longest_streak não muda em quebra
      WHERE id = p_couple_space_id;
    END IF;
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


-- ── Recriar trigger (aponta para a função atualizada) ─────────────────

DROP TRIGGER IF EXISTS tr_lovestreak_on_activity ON public.daily_activity;

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

CREATE TRIGGER tr_lovestreak_on_activity
AFTER INSERT ON public.daily_activity
FOR EACH ROW EXECUTE FUNCTION public.tr_fn_on_daily_activity();


-- ── Garantir message trigger usa sender_user_id + 4-col ON CONFLICT ──

CREATE OR REPLACE FUNCTION public.tr_on_message_for_missions()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.daily_activity (couple_space_id, user_id, activity_date, type)
  VALUES (NEW.couple_space_id, NEW.sender_user_id, CURRENT_DATE, 'message')
  ON CONFLICT (couple_space_id, user_id, activity_date, type) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_on_message_mission ON public.messages;
CREATE TRIGGER tr_on_message_mission
AFTER INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.tr_on_message_for_missions();


NOTIFY pgrst, 'reload schema';

SELECT
  'fix missions constraint + shields ✓' AS resultado,
  'A: daily_activity UNIQUE 3→4 cols | B: update_streak shields para gap≥1 | C: message trigger sender_user_id' AS fixes;
