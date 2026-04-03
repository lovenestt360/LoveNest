-- ============================================================
-- OVERLAPPING TRIGGER PURGE
-- Objetivo: Garantir que o antigo trigger de missões é removido.
-- O gatilho "tr_on_interaction_for_missions" foi substituído pelo
-- mais recente "tr_daily_activity_master_v5", mas pode não ter 
-- sido explicitamente apagado.
-- ============================================================

DROP TRIGGER IF EXISTS tr_on_interaction_for_missions ON public.daily_activity;
DROP FUNCTION IF EXISTS public.tr_on_interaction_for_missions() CASCADE;
