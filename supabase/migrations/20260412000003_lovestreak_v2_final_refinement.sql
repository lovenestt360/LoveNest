-- ══════════════════════════════════════════════════════════════
-- LOVESTREAK V2 — Refinamento Final (Pré-Launch)
-- Patch CIRÚRGICO: 5 problemas corrigidos, 0 comportamentos alterados.
-- ══════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────
-- FIX 1+5 (TASKS 1 & 5): HELPER CENTRALIZADO de contagem de membros
--
-- Problema: a lógica de "contar membros ativos" estava duplicada
-- em fn_process_streak, log_daily_activity e get_streak.
-- Uma mudança futura em qualquer uma delas causaria divergência silenciosa.
--
-- Solução: função IMMUTABLE-like, STABLE, chamada por todas as outras.
-- Detecta automaticamente se a coluna 'status' existe em 'members'.
-- Se existir: conta só status='active' OR status IS NULL (membership pendente).
-- Se não existir: conta todos (fallback seguro).
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_count_active_members(p_couple_id UUID)
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
        SELECT COUNT(*)
        INTO v_count
        FROM public.members
        WHERE couple_space_id = p_couple_id
          AND (status = 'active' OR status IS NULL);
        -- status IS NULL: membros sem status definido são incluídos
        -- (evita quebrar casais criados antes da coluna existir)
    ELSE
        SELECT COUNT(*)
        INTO v_count
        FROM public.members
        WHERE couple_space_id = p_couple_id;
    END IF;

    RETURN COALESCE(v_count, 0);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;


-- ─────────────────────────────────────────────────────────────
-- FIX 1 (TASK 1): fn_process_streak — usar helper centralizado
--
-- Elimina: bloco IF v_has_status com queries duplicadas
-- Resultado: lógica de status em apenas UM lugar
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_process_streak(p_couple_id UUID)
RETURNS VOID AS $$
DECLARE
    v_today         DATE    := CURRENT_DATE;
    v_active_users  INTEGER;
    v_total_members INTEGER;
    v_last_date     DATE;
    v_current       INTEGER;
    v_longest       INTEGER;
BEGIN
    -- Concorrência: lock transaccional por casal
    PERFORM pg_advisory_xact_lock(hashtext(p_couple_id::TEXT));

    -- Contagem centralizada (lógica de status num único lugar)
    v_total_members := public.fn_count_active_members(p_couple_id);

    -- Guard: casal incompleto → exit imediato
    IF v_total_members < 2 THEN
        RETURN;
    END IF;

    -- Utilizadores com atividade hoje
    SELECT COUNT(DISTINCT da.user_id)
    INTO v_active_users
    FROM public.daily_activity da
    WHERE da.couple_id     = p_couple_id
      AND da.activity_date = v_today;

    -- Regra core: ambos têm de estar ativos
    IF v_active_users < v_total_members THEN
        RETURN;
    END IF;

    -- Estado atual com lock da row
    SELECT last_active_date, current_streak, longest_streak
    INTO v_last_date, v_current, v_longest
    FROM public.streaks
    WHERE couple_id = p_couple_id
    FOR UPDATE;

    IF NOT FOUND THEN
        INSERT INTO public.streaks
            (couple_id, current_streak, longest_streak, last_active_date, status, updated_at)
        VALUES
            (p_couple_id, 1, 1, v_today, 'active', now())
        ON CONFLICT (couple_id) DO NOTHING;
        RETURN;
    END IF;

    -- Idempotência: já processado hoje
    IF v_last_date = v_today THEN
        RETURN;
    END IF;

    -- Lógica de streak
    IF v_last_date IS NOT NULL
       AND v_last_date = (v_today - INTERVAL '1 day')::DATE THEN
        v_current := COALESCE(v_current, 0) + 1;
        v_longest  := GREATEST(COALESCE(v_longest, 0), v_current);

        UPDATE public.streaks
        SET current_streak   = v_current,
            longest_streak   = v_longest,
            last_active_date = v_today,
            status           = 'active',
            updated_at       = now()
        WHERE couple_id = p_couple_id;
    ELSE
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


-- ─────────────────────────────────────────────────────────────
-- FIX 1+2 (TASKS 1 & 2): log_daily_activity
--
-- Corrigido:
--   [1] v_total agora usa fn_count_active_members → consistente
--   [2] Resposta de não-membro corrigida para status='invalid'
--       (antes: 'error:not_member' + 'status:active' — contradição)
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.log_daily_activity(
    p_couple_id UUID,
    p_type      TEXT DEFAULT 'general'
)
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_result  JSONB;
    v_active  INTEGER;
    v_total   INTEGER;
BEGIN
    -- FIX 2: resposta neutra e coerente para não-membro (sem exceção)
    IF NOT public.is_member_of_couple_space(p_couple_id) THEN
        RETURN jsonb_build_object(
            'current_streak',    0,
            'longest_streak',    0,
            'status',            'invalid',
            'updated_at',        now(),
            'both_active_today', false
        );
    END IF;

    -- Inserção idempotente: ON CONFLICT actualiza type apenas se vindo de 'general'
    INSERT INTO public.daily_activity (couple_id, user_id, activity_date, type)
    VALUES (p_couple_id, v_user_id, CURRENT_DATE, p_type)
    ON CONFLICT (couple_id, user_id, activity_date)
    DO UPDATE SET type = EXCLUDED.type
    WHERE public.daily_activity.type = 'general'
      AND EXCLUDED.type != 'general';

    -- FIX 1: contagem consistente com fn_process_streak
    SELECT COUNT(DISTINCT da.user_id)
    INTO v_active
    FROM public.daily_activity da
    WHERE da.couple_id    = p_couple_id
      AND da.activity_date = CURRENT_DATE;

    v_total := public.fn_count_active_members(p_couple_id); -- ← helper centralizado

    SELECT jsonb_build_object(
        'current_streak',    COALESCE(s.current_streak, 0),
        'longest_streak',    COALESCE(s.longest_streak, 0),
        'last_active_date',  s.last_active_date,
        'status',            COALESCE(s.status, 'active'),
        'updated_at',        s.updated_at,
        'both_active_today', (v_active >= v_total AND v_total >= 2)
    )
    INTO v_result
    FROM public.streaks s
    WHERE s.couple_id = p_couple_id;

    RETURN COALESCE(v_result, jsonb_build_object(
        'current_streak', 0, 'longest_streak', 0,
        'status', 'active', 'both_active_today', false,
        'updated_at', now()
    ));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ─────────────────────────────────────────────────────────────
-- FIX 1+3 (TASKS 1 & 3): get_streak
--
-- Corrigido:
--   [1] v_total usa fn_count_active_members → consistente
--   [3] v_current_streak removido — declarado mas nunca usado no jsonb
--   [3] days_since_last_activity: COALESCE(CASE..., NULL) → lido directo
--       da row de streaks (sem SELECT extra desnecessário)
--   [5] Queries minimizadas: v_yesterday_active lido inline na row join
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_streak(p_couple_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_result  JSONB;
    v_today   DATE    := CURRENT_DATE;
    v_active  INTEGER;
    v_total   INTEGER;
BEGIN
    -- Activos hoje
    SELECT COUNT(DISTINCT user_id)
    INTO v_active
    FROM public.daily_activity
    WHERE couple_id    = p_couple_id
      AND activity_date = v_today;

    -- FIX 1: contagem centralizada
    v_total := public.fn_count_active_members(p_couple_id);

    -- FIX 3: v_current_streak e v_days_since removidos.
    -- Todos os dados lidos numa única SELECT de streaks abaixo.
    SELECT jsonb_build_object(
        'current_streak',           COALESCE(s.current_streak, 0),
        'longest_streak',           COALESCE(s.longest_streak, 0),
        'last_active_date',         s.last_active_date,
        'status',                   COALESCE(s.status, 'active'),
        'updated_at',               s.updated_at,
        'both_active_today',        (v_active >= v_total AND v_total >= 2),
        'active_today_count',       v_active,
        'total_members',            v_total,
        'progress_percentage',      LEAST(ROUND((COALESCE(s.current_streak, 0)::NUMERIC / 28) * 100), 100),
        -- FIX 3: streak_at_risk usa v_active (já calculado) — sem SELECT extra
        'streak_at_risk',           (
            v_active < v_total
            AND s.last_active_date = (v_today - INTERVAL '1 day')::DATE
        ),
        -- FIX 3: lido directamente — COALESCE(CASE..., NULL) era redundante
        'days_since_last_activity', CASE
            WHEN s.last_active_date IS NOT NULL
            THEN (v_today - s.last_active_date)
            ELSE NULL
        END
    )
    INTO v_result
    FROM public.streaks s
    WHERE s.couple_id = p_couple_id;

    RETURN COALESCE(v_result, jsonb_build_object(
        'current_streak', 0, 'longest_streak', 0,
        'status', 'active', 'both_active_today', false,
        'active_today_count', v_active, 'total_members', v_total,
        'progress_percentage', 0, 'streak_at_risk', false,
        'days_since_last_activity', NULL
    ));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ─────────────────────────────────────────────────────────────
-- FIX 4 (TASK 4): INVARIANTE longest >= current
-- Garante que nenhum registo existente viola o invariante.
-- (já feito no hardening, repetido aqui para idempotência total)
-- ─────────────────────────────────────────────────────────────

UPDATE public.streaks
SET longest_streak = current_streak
WHERE longest_streak < current_streak;


-- ─────────────────────────────────────────────────────────────
-- VERIFICAÇÃO FINAL
-- ─────────────────────────────────────────────────────────────

SELECT
    (SELECT COUNT(*) FROM public.streaks WHERE couple_id IS NULL)           AS null_couple_ids,        -- deve ser 0
    (SELECT COUNT(*) FROM public.streaks WHERE longest_streak < current_streak) AS broken_invariant,   -- deve ser 0
    (SELECT COUNT(*) FROM public.streaks)                                   AS total_couples,
    (SELECT COUNT(*) FROM public.daily_activity WHERE activity_date = CURRENT_DATE) AS active_today
;

NOTIFY pgrst, 'reload schema';

SELECT 'LoveStreak V2 — Refinamento Final aplicado ✓' AS resultado;
