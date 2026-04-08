-- ============================================================
-- PURGA TOTAL DO SISTEMA DE GAMIFICAÇÃO (V13.0 - FIX)
-- Objetivo: Remover triggers e logic, resolvendo erros de dependências.
-- ============================================================

-- 1. REMOVER TODOS OS GATILHOS (TRIGGERS) - ORDEM CRÍTICA
DROP TRIGGER IF EXISTS tr_sync_total_points ON public.love_points;
DROP TRIGGER IF EXISTS tr_mission_completion_points_trigger ON public.mission_completions;
DROP TRIGGER IF EXISTS tr_daily_activity_master_v5 ON public.daily_activity;
DROP TRIGGER IF EXISTS tr_on_message_mission ON public.messages;
DROP TRIGGER IF EXISTS tr_update_streak_on_activity ON public.daily_activity;
DROP TRIGGER IF EXISTS tr_daily_activity_mission_trigger ON public.daily_activity;

-- 2. REMOVER TODAS AS FUNÇÕES (RPC) - COM CASCADE PARA EVITAR ERROS
DROP FUNCTION IF EXISTS public.fn_sync_points_to_streak() CASCADE;
DROP FUNCTION IF EXISTS public.fn_award_points(uuid, uuid, integer, text) CASCADE;
DROP FUNCTION IF EXISTS public.tr_fn_on_mission_completion_award() CASCADE;
DROP FUNCTION IF EXISTS public.tr_on_interaction_v5() CASCADE;
DROP FUNCTION IF EXISTS public.fn_get_or_create_daily_missions_v5(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.get_couple_daily_status(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.tr_on_interaction_for_missions() CASCADE;
DROP FUNCTION IF EXISTS public.checkmissioncompletion(uuid, uuid, text) CASCADE;
DROP FUNCTION IF EXISTS public.fn_purchase_loveshield_v5(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.fn_get_global_ranking() CASCADE;

-- 3. LIMPAR DADOS DAS TABELAS
TRUNCATE TABLE public.daily_activity CASCADE;
TRUNCATE TABLE public.mission_completions CASCADE;
TRUNCATE TABLE public.couple_daily_missions CASCADE;
TRUNCATE TABLE public.love_missions CASCADE;
TRUNCATE TABLE public.streaks CASCADE;
TRUNCATE TABLE public.love_points CASCADE;
TRUNCATE TABLE public.shields CASCADE;

