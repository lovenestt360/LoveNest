-- ══════════════════════════════════════════════════════════════
-- LOVESTREAK V2 — Motor de Produção (após patch de schema)
-- Single source of truth · Backend-only · No frontend logic
-- ══════════════════════════════════════════════════════════════

-- ── 1. RLS na tabela streaks ──────────────────────────────────────

ALTER TABLE public.streaks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view own streak" ON public.streaks;
CREATE POLICY "Members can view own streak"
ON public.streaks FOR SELECT
USING (public.is_member_of_couple_space(couple_id));


-- ── 2. RLS na tabela daily_activity ──────────────────────────────

ALTER TABLE public.daily_activity ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can insert own activity" ON public.daily_activity;
DROP POLICY IF EXISTS "Members can view couple activity" ON public.daily_activity;

CREATE POLICY "Members can insert own activity"
ON public.daily_activity FOR INSERT
WITH CHECK (
    user_id = auth.uid()
    AND public.is_member_of_couple_space(couple_id)
);

CREATE POLICY "Members can view couple activity"
ON public.daily_activity FOR SELECT
USING (public.is_member_of_couple_space(couple_id));


-- ── 3. MOTOR DO STREAK ───────────────────────────────────────────
-- Lógica: só avança se AMBOS os utilizadores do casal
-- estiveram ativos hoje. Idempotente.

CREATE OR REPLACE FUNCTION public.fn_process_streak(p_couple_id UUID)
RETURNS VOID AS $$
DECLARE
    v_today         DATE := CURRENT_DATE;
    v_active_users  INTEGER;
    v_total_members INTEGER;
    v_last_date     DATE;
    v_current       INTEGER;
    v_longest       INTEGER;
BEGIN
    -- Quantos membros do casal têm atividade HOJE?
    SELECT COUNT(DISTINCT da.user_id)
    INTO v_active_users
    FROM public.daily_activity da
    WHERE da.couple_id     = p_couple_id
      AND da.activity_date = v_today;

    -- Total de membros do casal
    SELECT COUNT(*)
    INTO v_total_members
    FROM public.members
    WHERE couple_space_id = p_couple_id;

    -- Regra core: só avança se AMBOS estiverem ativos e casal completo
    IF v_active_users < v_total_members OR v_total_members < 2 THEN
        RETURN;
    END IF;

    -- Estado atual do streak
    SELECT last_active_date, current_streak, longest_streak
    INTO v_last_date, v_current, v_longest
    FROM public.streaks
    WHERE couple_id = p_couple_id;

    IF NOT FOUND THEN
        -- Primeira atividade do casal
        INSERT INTO public.streaks
          (couple_id, current_streak, longest_streak, last_active_date, status)
        VALUES
          (p_couple_id, 1, 1, v_today, 'active');
        RETURN;
    END IF;

    -- Idempotência: já processado hoje → não fazer nada
    IF v_last_date = v_today THEN
        RETURN;
    END IF;

    IF v_last_date = (v_today - INTERVAL '1 day')::DATE THEN
        -- Dia consecutivo → incrementar
        v_current := v_current + 1;
        v_longest  := GREATEST(COALESCE(v_longest, 0), v_current);

        UPDATE public.streaks
        SET current_streak   = v_current,
            longest_streak   = v_longest,
            last_active_date = v_today,
            status           = 'active',
            updated_at       = now()
        WHERE couple_id = p_couple_id;
    ELSE
        -- Gap → quebrou → reset para 1
        UPDATE public.streaks
        SET current_streak   = 1,
            longest_streak   = GREATEST(COALESCE(v_longest, 0), 1),
            last_active_date = v_today,
            status           = 'broken',
            updated_at       = now()
        WHERE couple_id = p_couple_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ── 4. TRIGGER — dispara após cada atividade ─────────────────────

CREATE OR REPLACE FUNCTION public.tr_fn_on_daily_activity()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM public.fn_process_streak(NEW.couple_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_lovestreak_on_activity ON public.daily_activity;

CREATE TRIGGER tr_lovestreak_on_activity
AFTER INSERT ON public.daily_activity
FOR EACH ROW
EXECUTE FUNCTION public.tr_fn_on_daily_activity();


-- ── 5. RPC: log_daily_activity ────────────────────────────────────
-- Frontend chama ESTA função. Nunca escreve directamente nas tabelas.

CREATE OR REPLACE FUNCTION public.log_daily_activity(
    p_couple_id UUID,
    p_type      TEXT DEFAULT 'general'
)
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID  := auth.uid();
    v_result  JSONB;
BEGIN
    IF NOT public.is_member_of_couple_space(p_couple_id) THEN
        RAISE EXCEPTION 'Not a member of this couple space';
    END IF;

    -- Inserção idempotente — ON CONFLICT ignora duplicado
    INSERT INTO public.daily_activity (couple_id, user_id, activity_date, type)
    VALUES (p_couple_id, v_user_id, CURRENT_DATE, p_type)
    ON CONFLICT (couple_id, user_id, activity_date) DO NOTHING;

    -- Retornar estado actual do streak
    SELECT jsonb_build_object(
        'current_streak',   COALESCE(s.current_streak, 0),
        'longest_streak',   COALESCE(s.longest_streak, 0),
        'last_active_date', s.last_active_date,
        'status',           COALESCE(s.status, 'active')
    )
    INTO v_result
    FROM public.streaks s
    WHERE s.couple_id = p_couple_id;

    RETURN COALESCE(
        v_result,
        '{"current_streak":0,"longest_streak":0,"status":"active"}'::JSONB
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ── 6. RPC: get_streak ────────────────────────────────────────────
-- Leitura completa do streak + estado de atividade do dia.

CREATE OR REPLACE FUNCTION public.get_streak(p_couple_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_result  JSONB;
    v_today   DATE    := CURRENT_DATE;
    v_active  INTEGER;
    v_total   INTEGER;
BEGIN
    SELECT COUNT(DISTINCT user_id)
    INTO v_active
    FROM public.daily_activity
    WHERE couple_id   = p_couple_id
      AND activity_date = v_today;

    SELECT COUNT(*)
    INTO v_total
    FROM public.members
    WHERE couple_space_id = p_couple_id;

    SELECT jsonb_build_object(
        'current_streak',     COALESCE(s.current_streak, 0),
        'longest_streak',     COALESCE(s.longest_streak, 0),
        'last_active_date',   s.last_active_date,
        'status',             COALESCE(s.status, 'active'),
        'both_active_today',  (v_active >= v_total AND v_total >= 2),
        'active_today_count', v_active,
        'total_members',      v_total
    )
    INTO v_result
    FROM public.streaks s
    WHERE s.couple_id = p_couple_id;

    RETURN COALESCE(
        v_result,
        jsonb_build_object(
            'current_streak', 0, 'longest_streak', 0,
            'status', 'active', 'both_active_today', false,
            'active_today_count', v_active, 'total_members', v_total
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ── 7. RELOAD SCHEMA ─────────────────────────────────────────────

NOTIFY pgrst, 'reload schema';

SELECT 'LoveStreak V2 instalado com sucesso ✓' AS resultado;
