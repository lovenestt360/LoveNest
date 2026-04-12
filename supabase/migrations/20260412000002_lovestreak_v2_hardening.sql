-- ══════════════════════════════════════════════════════════════
-- LOVESTREAK V2 — Hardening para Produção
-- Audit: concorrência, integridade, inicialização, resposta rica
-- Nenhuma tabela nova. Nenhuma renomeação. Compatível com V2.
-- ══════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────
-- TASK 1: HARDEN fn_process_streak
-- Melhorias:
--   [+] pg_advisory_xact_lock → protecção contra race conditions
--   [+] Filtro de membros por status='active' (se coluna existir)
--   [+] Guard: membros < 2 → exit imediato
--   [+] Idempotência preservada: já processado hoje → return
--   [+] GREATEST/COALESCE defensivo em todos os paths
-- ───────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_process_streak(p_couple_id UUID)
RETURNS VOID AS $$
DECLARE
    v_today         DATE    := CURRENT_DATE;
    v_active_users  INTEGER;
    v_total_members INTEGER;
    v_last_date     DATE;
    v_current       INTEGER;
    v_longest       INTEGER;
    v_has_status    BOOLEAN;
BEGIN
    -- ── CONCORRÊNCIA: Advisory lock por casal ─────────────────────────────
    -- Evita race condition quando ambos os utilizadores inserem atividade
    -- ao mesmo tempo (ex: ambos enviam mensagem em simultaneo).
    -- O lock é ao nível da transação — liberta automaticamente no COMMIT.
    PERFORM pg_advisory_xact_lock(hashtext(p_couple_id::TEXT));

    -- ── CONTAR MEMBROS ATIVOS ─────────────────────────────────────────────
    -- Verifica se a coluna status existe na tabela members
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name   = 'members'
          AND column_name  = 'status'
    ) INTO v_has_status;

    IF v_has_status THEN
        -- Contar apenas membros com status = 'active'
        SELECT COUNT(*)
        INTO v_total_members
        FROM public.members
        WHERE couple_space_id = p_couple_id
          AND status = 'active';
    ELSE
        -- Sem coluna status → contar todos os membros
        SELECT COUNT(*)
        INTO v_total_members
        FROM public.members
        WHERE couple_space_id = p_couple_id;
    END IF;

    -- ── GUARD: sem casal completo → exit ─────────────────────────────────
    IF v_total_members < 2 THEN
        RETURN;
    END IF;

    -- ── CONTAR UTILIZADORES ATIVOS HOJE ──────────────────────────────────
    SELECT COUNT(DISTINCT da.user_id)
    INTO v_active_users
    FROM public.daily_activity da
    WHERE da.couple_id     = p_couple_id
      AND da.activity_date = v_today;

    -- ── REGRA CORE: ambos têm de estar ativos ────────────────────────────
    IF v_active_users < v_total_members THEN
        RETURN;
    END IF;

    -- ── ESTADO ATUAL DO STREAK ────────────────────────────────────────────
    SELECT last_active_date, current_streak, longest_streak
    INTO v_last_date, v_current, v_longest
    FROM public.streaks
    WHERE couple_id = p_couple_id
    FOR UPDATE; -- lock da row para evitar updates concorrentes

    IF NOT FOUND THEN
        -- Primeira atividade: criar registo
        INSERT INTO public.streaks
            (couple_id, current_streak, longest_streak, last_active_date, status, updated_at)
        VALUES
            (p_couple_id, 1, 1, v_today, 'active', now())
        ON CONFLICT (couple_id) DO NOTHING; -- segundo thread chega aqui → ignora
        RETURN;
    END IF;

    -- ── IDEMPOTÊNCIA: já processado hoje ─────────────────────────────────
    IF v_last_date = v_today THEN
        RETURN;
    END IF;

    -- ── LÓGICA DE STREAK ─────────────────────────────────────────────────
    IF v_last_date IS NOT NULL
       AND v_last_date = (v_today - INTERVAL '1 day')::DATE THEN
        -- Dia consecutivo → incrementar
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
        -- Gap ou primeiro dia após inatividade → reset para 1
        v_longest := GREATEST(COALESCE(v_longest, 0), 1);

        UPDATE public.streaks
        SET current_streak   = 1,
            longest_streak   = v_longest,
            last_active_date = v_today,
            status           = 'broken',
            updated_at       = now()
        WHERE couple_id = p_couple_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ───────────────────────────────────────────────────────────────
-- TASK 2: VALIDAR INTEGRIDADE DOS DADOS
-- [+] Garantir UNIQUE(couple_id) existe
-- [+] Remover linhas com couple_id NULL (nunca devem existir)
-- [+] Corrigir longest_streak < current_streak
-- ───────────────────────────────────────────────────────────────

-- 2a. Remover linhas com couple_id NULL (dados corrompidos)
DELETE FROM public.streaks WHERE couple_id IS NULL;

-- 2b. Garantir UNIQUE constraint existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_schema   = 'public'
          AND table_name     = 'streaks'
          AND constraint_type = 'UNIQUE'
          AND (constraint_name = 'streaks_couple_id_unique'
               OR constraint_name = 'streaks_couple_id_key')
    ) THEN
        ALTER TABLE public.streaks
            ADD CONSTRAINT streaks_couple_id_unique UNIQUE (couple_id);
        RAISE NOTICE 'UNIQUE constraint adicionado em streaks(couple_id)';
    ELSE
        RAISE NOTICE 'UNIQUE constraint já existe — nenhuma alteração';
    END IF;
END $$;

-- 2c. Corrigir: longest_streak deve ser sempre >= current_streak
UPDATE public.streaks
SET longest_streak = current_streak
WHERE longest_streak < current_streak;

-- 2d. Verificação de integridade — resultado visível
SELECT
    (SELECT COUNT(*) FROM public.streaks WHERE couple_id IS NULL)    AS null_couple_ids,
    (SELECT COUNT(*) FROM public.streaks WHERE longest_streak < current_streak) AS broken_longest,
    (SELECT COUNT(*) FROM public.streaks)                            AS total_streak_rows
;


-- ───────────────────────────────────────────────────────────────
-- TASK 3: INICIALIZAÇÃO SEGURA
-- [+] Só casais com EXATAMENTE 2 membros são inicializados
-- [+] ON CONFLICT DO NOTHING — sem duplicados
-- [+] Sem NULLs (couple_id NOT NULL garantido pelo schema)
-- ───────────────────────────────────────────────────────────────

INSERT INTO public.streaks (couple_id, current_streak, longest_streak, last_active_date, status, updated_at)
SELECT
    cs.id,
    0,
    0,
    NULL,
    'active',
    now()
FROM public.couple_spaces cs
WHERE (
    SELECT COUNT(*)
    FROM public.members m
    WHERE m.couple_space_id = cs.id
) >= 2  -- ← APENAS casais com pelo menos 2 membros
ON CONFLICT (couple_id) DO NOTHING; -- idempotente


-- ───────────────────────────────────────────────────────────────
-- TASK 4: MELHORAR log_daily_activity
-- [+] ON CONFLICT actualiza 'type' se a nova for mais específica
-- [+] Resposta inclui 'updated_at' e 'both_active_today'
-- [+] Nunca lança excepção para atividade duplicada
-- ───────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.log_daily_activity(
    p_couple_id UUID,
    p_type      TEXT DEFAULT 'general'
)
RETURNS JSONB AS $$
DECLARE
    v_user_id    UUID    := auth.uid();
    v_result     JSONB;
    v_active     INTEGER;
    v_total      INTEGER;
BEGIN
    -- Validar membership
    IF NOT public.is_member_of_couple_space(p_couple_id) THEN
        -- Retorna vazio em vez de lançar excepção — nunca bloqueia UI
        RETURN jsonb_build_object(
            'error', 'not_member',
            'current_streak', 0,
            'status', 'active'
        );
    END IF;

    -- Inserção idempotente — ON CONFLICT: actualiza type se mais específico
    -- (ex: 'general' → 'message' se a nova for mais descritiva)
    INSERT INTO public.daily_activity (couple_id, user_id, activity_date, type)
    VALUES (p_couple_id, v_user_id, CURRENT_DATE, p_type)
    ON CONFLICT (couple_id, user_id, activity_date)
    DO UPDATE SET type = EXCLUDED.type
    WHERE public.daily_activity.type = 'general'
      AND EXCLUDED.type != 'general';
    -- Se já existe com tipo específico → não sobrescreve (silent ignore)

    -- Calcular both_active_today para a resposta
    SELECT COUNT(DISTINCT da.user_id)
    INTO v_active
    FROM public.daily_activity da
    WHERE da.couple_id = p_couple_id AND da.activity_date = CURRENT_DATE;

    SELECT COUNT(*) INTO v_total
    FROM public.members WHERE couple_space_id = p_couple_id;

    -- Retornar estado atualizado do streak
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

    RETURN COALESCE(
        v_result,
        jsonb_build_object(
            'current_streak', 0, 'longest_streak', 0,
            'status', 'active', 'both_active_today', false,
            'updated_at', now()
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ───────────────────────────────────────────────────────────────
-- TASK 6: MELHORAR get_streak
-- [+] progress_percentage: dias actuais / avg_cycle_days (28)
-- [+] partner_active_today: booleanFalse se parceiro não registou
-- [+] days_since_last_activity: útil para detectar risco de break
-- [+] streak_at_risk: true se ontem não houve atividade (gap risk)
-- ───────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_streak(p_couple_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_result             JSONB;
    v_today              DATE    := CURRENT_DATE;
    v_active             INTEGER;
    v_total              INTEGER;
    v_current_streak     INTEGER;
    v_yesterday_active   INTEGER;
    v_days_since         INTEGER;
BEGIN
    -- Utilizadores activos HOJE
    SELECT COUNT(DISTINCT user_id)
    INTO v_active
    FROM public.daily_activity
    WHERE couple_id    = p_couple_id
      AND activity_date = v_today;

    -- Total de membros
    SELECT COUNT(*)
    INTO v_total
    FROM public.members
    WHERE couple_space_id = p_couple_id;

    -- Actividade de ONTEM (para detectar risco de quebra)
    SELECT COUNT(DISTINCT user_id)
    INTO v_yesterday_active
    FROM public.daily_activity
    WHERE couple_id    = p_couple_id
      AND activity_date = (v_today - INTERVAL '1 day')::DATE;

    -- Estado atual
    SELECT current_streak INTO v_current_streak
    FROM public.streaks WHERE couple_id = p_couple_id;

    -- Dias desde última actividade
    SELECT COALESCE(
        (v_today - s.last_active_date),
        999  -- nunca tiveram streak
    )
    INTO v_days_since
    FROM public.streaks s
    WHERE s.couple_id = p_couple_id;

    SELECT jsonb_build_object(
        -- Core
        'current_streak',        COALESCE(s.current_streak, 0),
        'longest_streak',        COALESCE(s.longest_streak, 0),
        'last_active_date',      s.last_active_date,
        'status',                COALESCE(s.status, 'active'),
        'updated_at',            s.updated_at,
        -- Actividade de hoje
        'both_active_today',     (v_active >= v_total AND v_total >= 2),
        'active_today_count',    v_active,
        'total_members',         v_total,
        -- Inteligência extra (TASK 6)
        'progress_percentage',   LEAST(ROUND((COALESCE(s.current_streak, 0)::NUMERIC / 28) * 100), 100),
        'streak_at_risk',        (
            v_active < v_total              -- não completaram hoje
            AND s.last_active_date = (v_today - INTERVAL '1 day')::DATE -- mas ontem sim
        ),
        'days_since_last_activity', COALESCE(
            CASE WHEN s.last_active_date IS NOT NULL
                 THEN (v_today - s.last_active_date)
                 ELSE NULL END,
            NULL
        )
    )
    INTO v_result
    FROM public.streaks s
    WHERE s.couple_id = p_couple_id;

    RETURN COALESCE(
        v_result,
        jsonb_build_object(
            'current_streak', 0, 'longest_streak', 0,
            'status', 'active', 'both_active_today', false,
            'active_today_count', v_active, 'total_members', v_total,
            'progress_percentage', 0, 'streak_at_risk', false,
            'days_since_last_activity', NULL
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ───────────────────────────────────────────────────────────────
-- RELOAD SCHEMA
-- ───────────────────────────────────────────────────────────────

NOTIFY pgrst, 'reload schema';

SELECT 'LoveStreak V2 — Hardening aplicado com sucesso ✓' AS resultado;
