-- =============================================================================
-- 🧨 PURGA DEFINITIVA DA GAMIFICAÇÃO — LOVENEST (V2 — ARQUITETURA COMPLETA)
-- =============================================================================
-- Cobre TODOS os triggers, funções, tabelas e políticas RLS criados em:
--   20260325000000_rebuild_streaks_missions.sql
--   20260330000001_lovestreak_engine.sql
--   20260330000002_real_missions.sql
--   20260330000003_real_love_points.sql
--   20260330000004_love_shields_v2.sql
--   20260330000005_sync_total_points.sql
--   20260330000006_global_ranking_rpc.sql
--   20260401000000 → 20260403000001 (repair iterations)
--   20260402000001_nuclear_cleanup_streaks.sql
-- =============================================================================


-- =============================================================================
-- 🔥 BLOCO 1: REMOVER TODOS OS TRIGGERS EXPLÍCITOS (POR NOME + TABELA)
-- Garante que nenhum trigger fica ativo, mesmo que as tabelas estejam vazias.
-- =============================================================================

-- Triggers em daily_activity
DROP TRIGGER IF EXISTS tr_daily_activity_master_v5         ON public.daily_activity;
DROP TRIGGER IF EXISTS tr_daily_activity_mission_trigger   ON public.daily_activity;
DROP TRIGGER IF EXISTS tr_update_streak_on_activity        ON public.daily_activity;
DROP TRIGGER IF EXISTS tr_on_interaction_v5                ON public.daily_activity;

-- Triggers em messages
DROP TRIGGER IF EXISTS tr_on_message_mission               ON public.messages;

-- Triggers em mission_completions
DROP TRIGGER IF EXISTS tr_mission_completion_points_trigger ON public.mission_completions;

-- Triggers em love_streaks (nome legado) e streaks (nome atual)
DROP TRIGGER IF EXISTS tr_sync_total_points                ON public.love_streaks;
DROP TRIGGER IF EXISTS tr_streak_increment_points_trigger  ON public.love_streaks;
DROP TRIGGER IF EXISTS tr_sync_total_points                ON public.streaks;
DROP TRIGGER IF EXISTS tr_streak_increment_points_trigger  ON public.streaks;

-- Triggers em interactions
DROP TRIGGER IF EXISTS tr_interactions_mission_trigger     ON public.interactions;


-- =============================================================================
-- 🔥 BLOCO 2: REMOVER TODOS OS TRIGGERS DINÂMICOS RESTANTES (SEGURANÇA TOTAL)
-- Este bloco apanha qualquer trigger residual que não tenha nome explícito acima.
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
            RAISE NOTICE 'Aviso ao remover trigger % na tabela %: %',
                r.trigger_name, r.event_object_table, SQLERRM;
        END;
    END LOOP;
END $$;


-- =============================================================================
-- 🔥 BLOCO 3: REMOVER TODAS AS FUNÇÕES DE GAMIFICAÇÃO (POR NOME EXATO)
-- Inclui funções de triggers, RPCs chamadas pelo frontend e helpers internos.
-- =============================================================================

-- Funções de Streak Engine
DROP FUNCTION IF EXISTS public.fn_update_streak_v5()                              CASCADE;
DROP FUNCTION IF EXISTS public.fn_check_streak(UUID)                               CASCADE;
DROP FUNCTION IF EXISTS public.fn_confirm_daily_action(UUID)                       CASCADE;
DROP FUNCTION IF EXISTS public.fn_process_shield_rewards(UUID, INTEGER)            CASCADE;
DROP FUNCTION IF EXISTS public.fn_sync_points_to_streak()                          CASCADE;
DROP FUNCTION IF EXISTS public.checkDailyInteraction(UUID)                         CASCADE;

-- Funções de Missões
DROP FUNCTION IF EXISTS public.tr_on_interaction_v5()                              CASCADE;
DROP FUNCTION IF EXISTS public.tr_on_interaction_for_missions()                    CASCADE;
DROP FUNCTION IF EXISTS public.fn_get_or_create_daily_missions_v5(UUID)            CASCADE;
DROP FUNCTION IF EXISTS public.get_couple_daily_status(UUID)                       CASCADE;
DROP FUNCTION IF EXISTS public.generateDailyMissions(UUID)                         CASCADE;
DROP FUNCTION IF EXISTS public.checkMissionCompletion(UUID, UUID)                  CASCADE;
DROP FUNCTION IF EXISTS public.checkMissionCompletion(UUID, UUID, TEXT)            CASCADE;
DROP FUNCTION IF EXISTS public.checkmissioncompletion(UUID, UUID, TEXT)            CASCADE;

-- Funções de Points
DROP FUNCTION IF EXISTS public.fn_award_points(UUID, UUID, INTEGER, TEXT)          CASCADE;
DROP FUNCTION IF EXISTS public.tr_fn_on_mission_completion_award()                 CASCADE;
DROP FUNCTION IF EXISTS public.tr_fn_on_streak_increment_award()                   CASCADE;

-- Funções de Shields
DROP FUNCTION IF EXISTS public.fn_purchase_loveshield(INTEGER)                     CASCADE;
DROP FUNCTION IF EXISTS public.fn_purchase_loveshield_v4(INTEGER)                  CASCADE;
DROP FUNCTION IF EXISTS public.fn_purchase_loveshield_v5(UUID, UUID)               CASCADE;
DROP FUNCTION IF EXISTS public.fn_use_loveshield()                                 CASCADE;
DROP FUNCTION IF EXISTS public.fn_use_loveshield_v4()                              CASCADE;

-- Funções de Ranking
DROP FUNCTION IF EXISTS public.fn_get_global_ranking()                             CASCADE;
DROP FUNCTION IF EXISTS public.fn_get_global_ranking(TEXT)                         CASCADE;

-- Funções de missions trigger repair (iterações)
DROP FUNCTION IF EXISTS public.tr_fn_on_master_activity_v5()                      CASCADE;


-- =============================================================================
-- 🔥 BLOCO 4: VARREDURA DINÂMICA — ELIMINA QUALQUER FUNÇÃO PUBLIC COM NOME
--              QUE CONTENHA PALAVRAS-CHAVE DE GAMIFICAÇÃO
-- Apanha versões futuras ou renomeadas que tenham escapado ao bloco 3.
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
              p.proname ILIKE '%streak%'   OR
              p.proname ILIKE '%mission%'  OR
              p.proname ILIKE '%point%'    OR
              p.proname ILIKE '%ranking%'  OR
              p.proname ILIKE '%shield%'   OR
              p.proname ILIKE '%loveshield%'
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
-- 🔥 BLOCO 5: LIMPAR DADOS DE TODAS AS TABELAS DE GAMIFICAÇÃO
-- Usamos TRUNCATE com CASCADE para consistência total.
-- As tabelas são mantidas (não DROP) para permitir uma V2 limpa no futuro.
-- =============================================================================

-- Streaks (nome atual + nome legado)
TRUNCATE TABLE public.streaks              CASCADE;

-- Missões
TRUNCATE TABLE public.daily_activity       CASCADE;
TRUNCATE TABLE public.mission_completions  CASCADE;
TRUNCATE TABLE public.couple_daily_missions CASCADE;
TRUNCATE TABLE public.love_missions        CASCADE;

-- Pontos
TRUNCATE TABLE public.love_points          CASCADE;

-- Escudos / Shields
TRUNCATE TABLE public.love_shields         CASCADE;

-- Tabelas legadas (podem ou não existir — sem erro se não existirem)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'love_streaks') THEN
        TRUNCATE TABLE public.love_streaks CASCADE;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'love_points_history') THEN
        TRUNCATE TABLE public.love_points_history CASCADE;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'shields') THEN
        TRUNCATE TABLE public.shields CASCADE;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_items') THEN
        TRUNCATE TABLE public.user_items CASCADE;
    END IF;
END $$;


-- =============================================================================
-- 🔥 BLOCO 6: FEATURE FLAGS — DESATIVAR FLAGS DE GAMIFICAÇÃO
-- Garante que qualquer nova feature que use feature_flags não ativa funcionalidades
-- de gamificação acidentalmente.
-- =============================================================================

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


-- =============================================================================
-- ✅ BLOCO 7: VERIFICAÇÃO DE SANIDADE (OPCIONAL — EXECUTAR NO SQL EDITOR)
-- Descomenta as linhas abaixo para confirmar que a purga foi bem-sucedida.
-- =============================================================================

-- -- Deve retornar 0 linhas (nenhum trigger restante):
-- SELECT trigger_name, event_object_table
-- FROM information_schema.triggers
-- WHERE trigger_schema = 'public';

-- -- Deve retornar 0 linhas (nenhuma função de gamificação restante):
-- SELECT routine_name
-- FROM information_schema.routines
-- WHERE routine_schema = 'public'
--   AND (
--     routine_name ILIKE '%streak%' OR routine_name ILIKE '%mission%' OR
--     routine_name ILIKE '%point%'  OR routine_name ILIKE '%ranking%' OR
--     routine_name ILIKE '%shield%'
--   );

-- -- Deve retornar 0 linhas (dados limpos):
-- SELECT (SELECT COUNT(*) FROM public.streaks)        AS streaks,
--        (SELECT COUNT(*) FROM public.daily_activity) AS daily_activity,
--        (SELECT COUNT(*) FROM public.love_points)    AS love_points,
--        (SELECT COUNT(*) FROM public.love_shields)   AS love_shields,
--        (SELECT COUNT(*) FROM public.love_missions)  AS love_missions;


-- =============================================================================
-- 🔔 RECARREGAR SCHEMA DO POSTGREST (OBRIGATÓRIO)
-- =============================================================================

NOTIFY pgrst, 'reload schema';
