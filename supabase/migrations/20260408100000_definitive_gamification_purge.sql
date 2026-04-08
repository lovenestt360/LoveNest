-- =============================================================================
-- 🧨 PURGA COMPLEMENTAR — LOVENEST (V3 — SAFE COMPLEMENT)
-- =============================================================================
-- Este script é seguro para executar DEPOIS do SQL do ChatGPT já ter corrido.
-- Cobre tudo o que esse SQL deixou para trás, sem causar erros em tabelas
-- ou triggers que já não existem.
-- =============================================================================


-- =============================================================================
-- 🔥 BLOCO 1: REMOVER TRIGGERS RESIDUAIS (DINÂMICO + TOLERANTE A ERROS)
-- Usa IF EXISTS seguro dentro de um bloco de exceção.
-- =============================================================================

DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT DISTINCT trigger_name, event_object_table
        FROM information_schema.triggers
        WHERE trigger_schema = 'public'
    )
    LOOP
        BEGIN
            EXECUTE format(
                'DROP TRIGGER IF EXISTS %I ON public.%I CASCADE;',
                r.trigger_name,
                r.event_object_table
            );
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Aviso ao remover trigger % em %: %',
                r.trigger_name, r.event_object_table, SQLERRM;
        END;
    END LOOP;
END $$;


-- =============================================================================
-- 🔥 BLOCO 2: REMOVER FUNÇÕES DE GAMIFICAÇÃO (VARREDURA COMPLETA)
-- Inclui 'shield' e 'loveshield' que o ChatGPT não cobriu.
-- =============================================================================

DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
          AND (
              p.proname ILIKE '%streak%'    OR
              p.proname ILIKE '%mission%'   OR
              p.proname ILIKE '%point%'     OR
              p.proname ILIKE '%ranking%'   OR
              p.proname ILIKE '%shield%'    OR
              p.proname ILIKE '%loveshield%'OR
              p.proname ILIKE '%daily_action%' OR
              p.proname ILIKE '%daily_interaction%'
          )
    )
    LOOP
        BEGIN
            EXECUTE format(
                'DROP FUNCTION IF EXISTS public.%I(%s) CASCADE;',
                r.proname,
                r.args
            );
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Aviso ao remover função public.%(%): %',
                r.proname, r.args, SQLERRM;
        END;
    END LOOP;
END $$;


-- =============================================================================
-- 🔥 BLOCO 3: LIMPAR TABELAS (SEGURO — VERIFICA EXISTÊNCIA ANTES DE LIMPAR)
-- Cobre as tabelas que o ChatGPT ignorou.
-- =============================================================================

DO $$
BEGIN
    -- Tabelas cobertas pelo ChatGPT (garantia de limpeza total)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'daily_activity') THEN
        DELETE FROM public.daily_activity;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'streaks') THEN
        DELETE FROM public.streaks;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'love_missions') THEN
        DELETE FROM public.love_missions;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'couple_daily_missions') THEN
        DELETE FROM public.couple_daily_missions;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'mission_completions') THEN
        DELETE FROM public.mission_completions;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'love_points') THEN
        DELETE FROM public.love_points;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'shields') THEN
        DELETE FROM public.shields;
    END IF;

    -- ✅ TABELAS QUE O CHATGPT NÃO COBRIU:

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'love_streaks') THEN
        DELETE FROM public.love_streaks;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'love_shields') THEN
        DELETE FROM public.love_shields;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'love_points_history') THEN
        DELETE FROM public.love_points_history;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_items') THEN
        DELETE FROM public.user_items;
    END IF;

END $$;


-- =============================================================================
-- 🔥 BLOCO 4: FEATURE FLAGS — DESATIVAR FLAGS DE GAMIFICAÇÃO
-- Evita que a UI reative funcionalidades de gamificação acidentalmente.
-- =============================================================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'feature_flags') THEN
        UPDATE public.feature_flags
        SET enabled = false
        WHERE key IN (
            'home_lovestreak',
            'ranking',
            'missions',
            'love_points',
            'love_shields',
            'daily_missions',
            'gamification'
        );
    END IF;
END $$;


-- =============================================================================
-- ✅ BLOCO 5: VERIFICAÇÃO DE SANIDADE
-- Descomenta para confirmar que tudo foi limpo.
-- =============================================================================

-- -- Triggers restantes (deve retornar 0 linhas):
-- SELECT trigger_name, event_object_table
-- FROM information_schema.triggers
-- WHERE trigger_schema = 'public';

-- -- Funções de gamificação restantes (deve retornar 0 linhas):
-- SELECT routine_name
-- FROM information_schema.routines
-- WHERE routine_schema = 'public'
--   AND (routine_name ILIKE '%streak%' OR routine_name ILIKE '%mission%'
--     OR routine_name ILIKE '%point%'  OR routine_name ILIKE '%ranking%'
--     OR routine_name ILIKE '%shield%');

-- -- Contagem de dados (todos devem ser 0):
-- SELECT
--   (SELECT COUNT(*) FROM public.daily_activity)      AS daily_activity,
--   (SELECT COUNT(*) FROM public.streaks)             AS streaks,
--   (SELECT COUNT(*) FROM public.love_points)         AS love_points,
--   (SELECT COUNT(*) FROM public.love_missions)       AS love_missions,
--   (SELECT COUNT(*) FROM public.mission_completions) AS mission_completions;


-- =============================================================================
-- 🔔 RECARREGAR SCHEMA DO POSTGREST
-- =============================================================================

NOTIFY pgrst, 'reload schema';
