-- ============================================================
-- PURGA FINAL DE LEGADO — ARQUITETURA STREAKS V5.1 (NUCLEAR V2)
-- Objetivo: Eliminar TUDO o que resta de 'love_streaks' e redundâncias.
-- ============================================================

-- 1. ELIMINAR GATILHOS E FUNÇÕES QUE REFERENCIAM 'love_streaks'
DROP TRIGGER IF EXISTS tr_sync_total_points ON public.love_points;
DROP TRIGGER IF EXISTS tr_on_message_mission ON public.messages;
DROP FUNCTION IF EXISTS public.fn_sync_points_to_streak();

-- 2. GARANTIR QUE A TABELA STREAKS ESTÁ CORRETA (Sem colunas redundantes como total_points)
-- O ranking agora calcula pontos on-the-fly para evitar dessincronização.
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='streaks' AND column_name='total_points') THEN
        ALTER TABLE public.streaks DROP COLUMN total_points;
    END IF;
END $$;

-- 3. UNIFICAR GATILHO DE MISSÕES E STREAKS NA DAILY_ACTIVITY
-- 'daily_activity' é agora a ÚNICA fonte para progressão de gamificação.

CREATE OR REPLACE FUNCTION public.tr_on_interaction_v5()
RETURNS TRIGGER AS $$
DECLARE
    v_couple_id UUID;
BEGIN
    v_couple_id := NEW.couple_id;

    -- A) Atualizar Streak (V5)
    PERFORM public.fn_update_streak_v5(); -- Usamos a função que já criámos

    -- B) Verificar Missões (V5)
    PERFORM public.checkMissionCompletion(v_couple_id, NEW.user_id, NEW.type);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Limpar gatilhos antigos da daily_activity
DROP TRIGGER IF EXISTS tr_daily_activity_mission_trigger ON public.daily_activity;
DROP TRIGGER IF EXISTS tr_update_streak_on_activity ON public.daily_activity;

-- Criar o Gatilho Unificado (O Único e Definitivo)
CREATE TRIGGER tr_daily_activity_master_v5
AFTER INSERT ON public.daily_activity
FOR EACH ROW EXECUTE FUNCTION public.tr_on_interaction_v5();

-- 4. LIMPEZA FINAL DE QUALQUER REFERÊNCIA NO DICIONÁRIO DE DADOS
DO $$
BEGIN
    -- Se por milagre ainda existir a tabela love_streaks, elimina-a agora com CASCADE
    DROP TABLE IF EXISTS public.love_streaks CASCADE;
END $$;

-- 5. RE-VINCULAR RANKING (Garantir que a versão correta está ativa)
CREATE OR REPLACE FUNCTION public.fn_get_global_ranking(p_rank_type TEXT)
RETURNS TABLE (
    couple_space_id UUID,
    current_streak INTEGER,
    total_points BIGINT,
    house_name TEXT,
    house_image TEXT,
    is_verified BOOLEAN
) AS $$
BEGIN
    IF p_rank_type = 'total_points' THEN
        RETURN QUERY
        SELECT 
            s.couple_id,
            s.current_streak,
            COALESCE((SELECT SUM(lp.points) FROM public.love_points lp WHERE lp.couple_space_id = s.couple_id), 0)::BIGINT as total_points,
            cs.house_name,
            cs.house_image,
            cs.is_verified
        FROM public.streaks s
        JOIN public.couple_spaces cs ON s.couple_id = cs.id
        ORDER BY total_points DESC NULLS LAST, s.current_streak DESC
        LIMIT 100;
    ELSE
        RETURN QUERY
        SELECT 
            s.couple_id,
            s.current_streak,
            COALESCE((SELECT SUM(lp.points) FROM public.love_points lp WHERE lp.couple_space_id = s.couple_id), 0)::BIGINT as total_points,
            cs.house_name,
            cs.house_image,
            cs.is_verified
        FROM public.streaks s
        JOIN public.couple_spaces cs ON s.couple_id = cs.id
        ORDER BY s.current_streak DESC NULLS LAST, total_points DESC
        LIMIT 100;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
