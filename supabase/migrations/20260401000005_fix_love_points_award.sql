-- ============================================================
-- REPARAÇÃO DO SISTEMA DE PONTOS (LOVEPOINTS)
-- Garantir que cada missão concluída gera pontos reais.
-- ============================================================

-- 1. Garantir que a função de atribuição de pontos é robusta
CREATE OR REPLACE FUNCTION public.fn_award_points(
    p_user_id UUID, 
    p_couple_space_id UUID, 
    p_amount INTEGER, 
    p_reason TEXT
)
RETURNS VOID AS $$
BEGIN
    -- Upsert na tabela de pontos individuais
    INSERT INTO public.love_points (user_id, couple_space_id, points, updated_at)
    VALUES (p_user_id, p_couple_space_id, p_amount, now())
    ON CONFLICT (user_id, couple_space_id) 
    DO UPDATE SET 
        points = public.love_points.points + EXCLUDED.points,
        updated_at = now();

    -- Registar no histórico para auditoria
    INSERT INTO public.love_points_history (user_id, couple_space_id, amount, reason)
    VALUES (p_user_id, p_couple_space_id, p_amount, p_reason);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Refazer a função de trigger da conclusão de missões
CREATE OR REPLACE FUNCTION public.tr_fn_on_mission_completion_award()
RETURNS TRIGGER AS $$
DECLARE
    v_reward INTEGER;
BEGIN
    -- Obter a recompensa da tabela love_missions
    SELECT reward_points INTO v_reward 
    FROM public.love_missions 
    WHERE id = NEW.mission_id;
    
    -- Atribuir pontos (Mínimo 10 se estiver nulo)
    PERFORM public.fn_award_points(
        NEW.user_id, 
        NEW.couple_space_id, 
        COALESCE(v_reward, 10), 
        'mission_completed'
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Reativar o Trigger na tabela mission_completions
DROP TRIGGER IF EXISTS tr_mission_completion_points_trigger ON public.mission_completions;
CREATE TRIGGER tr_mission_completion_points_trigger
AFTER INSERT ON public.mission_completions
FOR EACH ROW EXECUTE FUNCTION public.tr_fn_on_mission_completion_award();

-- 4. Garantir sincronização com os pontos totais da LoveStreak (Para o Ranking)
CREATE OR REPLACE FUNCTION public.fn_sync_points_to_streak()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.love_streaks
    SET total_points = (
        SELECT COALESCE(SUM(points), 0)
        FROM public.love_points
        WHERE couple_space_id = NEW.couple_space_id
    )
    WHERE couple_space_id = NEW.couple_space_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_sync_total_points ON public.love_points;
CREATE TRIGGER tr_sync_total_points
AFTER INSERT OR UPDATE OR DELETE ON public.love_points
FOR EACH ROW EXECUTE FUNCTION public.fn_sync_points_to_streak();
