-- LOVE ENGINE V2: AUTOMATIC STREAKS & ENGAGEMENT
-- Este script implementa a lógica automática para manter os Love Streaks vivos.

-- 1. Função para identificar qual parceiro está a interagir
CREATE OR REPLACE FUNCTION public.update_streak_interaction()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_couple_space_id uuid;
BEGIN
    -- Obter o couple_space_id do utilizador atual
    SELECT couple_space_id INTO v_couple_space_id 
    FROM public.members 
    WHERE user_id = auth.uid()
    LIMIT 1;

    IF v_couple_space_id IS NULL THEN
        RETURN NEW;
    END IF;

    -- Marcar a interação na tabela love_streaks
    -- Partner 1 is the one who joined first, Partner 2 joined second.
    UPDATE public.love_streaks
    SET 
        partner1_interacted_today = CASE 
            WHEN (SELECT user_id FROM public.members WHERE couple_space_id = v_couple_space_id ORDER BY joined_at ASC LIMIT 1) = auth.uid() 
            THEN true 
            ELSE partner1_interacted_today 
        END,
        partner2_interacted_today = CASE 
            WHEN (SELECT user_id FROM public.members WHERE couple_space_id = v_couple_space_id ORDER BY joined_at DESC LIMIT 1) = auth.uid() 
            THEN true 
            ELSE partner2_interacted_today 
        END,
        interaction_date = CURRENT_DATE,
        updated_at = now()
    WHERE couple_space_id = v_couple_space_id;

    RETURN NEW;
END;
$$;

-- 2. Triggers para interações (Unificados)
DROP TRIGGER IF EXISTS tr_streak_msg ON public.messages;
CREATE TRIGGER tr_streak_msg AFTER INSERT ON public.messages FOR EACH ROW EXECUTE FUNCTION public.update_streak_interaction();

DROP TRIGGER IF EXISTS tr_streak_mood ON public.mood_checkins;
CREATE TRIGGER tr_streak_mood AFTER INSERT ON public.mood_checkins FOR EACH ROW EXECUTE FUNCTION public.update_streak_interaction();

DROP TRIGGER IF EXISTS tr_streak_task ON public.tasks;
CREATE TRIGGER tr_streak_task AFTER UPDATE OF status ON public.tasks FOR EACH ROW WHEN (NEW.status = 'done') EXECUTE FUNCTION public.update_streak_interaction();

DROP TRIGGER IF EXISTS tr_streak_photos ON public.photos;
CREATE TRIGGER tr_streak_photos AFTER INSERT ON public.photos FOR EACH ROW EXECUTE FUNCTION public.update_streak_interaction();

-- 3. Função para processar a virada do dia (Streak increment and Shields)
-- Esta função deve ser chamada por um cron job ou ao primeiro login do dia
CREATE OR REPLACE FUNCTION public.process_daily_streaks()
RETURNS void 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Casais que completaram a interação de ambos os lados: Incrementa streak
    UPDATE public.love_streaks
    SET 
        current_streak = current_streak + 1,
        best_streak = GREATEST(best_streak, current_streak + 1),
        partner1_interacted_today = false,
        partner2_interacted_today = false,
        last_streak_date = CURRENT_DATE
    WHERE partner1_interacted_today = true AND partner2_interacted_today = true;

    -- Casais que FALHARAM: Tentar usar SHIELD
    UPDATE public.love_streaks
    SET 
        shield_remaining = shield_remaining - 1,
        partner1_interacted_today = false,
        partner2_interacted_today = false
        -- Streak mantido pelo shield
    WHERE (partner1_interacted_today = false OR partner2_interacted_today = false)
    AND shield_remaining > 0
    AND interaction_date < CURRENT_DATE;

    -- Casais que FALHARAM SEM SHIELD: Resetar streak
    UPDATE public.love_streaks
    SET 
        current_streak = 0,
        partner1_interacted_today = false,
        partner2_interacted_today = false
    WHERE (partner1_interacted_today = false OR partner2_interacted_today = false)
    AND shield_remaining = 0
    AND interaction_date < CURRENT_DATE;
END;
$$;

-- 4. Notificações pgrst
NOTIFY pgrst, 'reload schema';
