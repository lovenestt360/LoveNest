-- ============================================================
-- LOVE ENGINE V4: TOTAL AUTOMATION & CONSOLIDATION (SINGULAR)
-- Esta versão é a fonte única de verdade para interações e streaks.
-- Tabelas: interactions, love_streak, love_points (Singulares).
-- ============================================================

-- 1. Tabelas Base (Garantir existam com nomes singulares)
CREATE TABLE IF NOT EXISTS public.interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    couple_id UUID REFERENCES public.couple_spaces(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.love_streak (
    couple_id UUID PRIMARY KEY REFERENCES public.couple_spaces(id) ON DELETE CASCADE,
    current_streak INTEGER DEFAULT 0 NOT NULL,
    last_active_date DATE,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 2. Master Interaction Function (V4)
CREATE OR REPLACE FUNCTION public.fn_record_interaction_v4()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_couple_id uuid;
    v_interaction_type text;
    v_user_id uuid;
BEGIN
    v_interaction_type := TG_TABLE_NAME;
    
    -- Determinar Usuário e Couple ID
    CASE v_interaction_type
        WHEN 'messages' THEN 
            v_user_id := NEW.sender_user_id;
            v_couple_id := NEW.couple_space_id;
            v_interaction_type := 'message_sent';
        WHEN 'mood_checkins' THEN 
            v_user_id := NEW.user_id;
            v_couple_id := NEW.couple_space_id;
            v_interaction_type := 'mood_logged';
        WHEN 'tasks' THEN 
            v_user_id := auth.uid();
            v_couple_id := NEW.couple_space_id;
            v_interaction_type := 'task_completed';
        WHEN 'photos' THEN 
            v_user_id := NEW.uploaded_by;
            v_couple_id := NEW.couple_space_id;
            v_interaction_type := 'photo_shared';
        WHEN 'plano_items' THEN 
            v_user_id := NEW.user_id;
            v_couple_id := NEW.couple_space_id;
            v_interaction_type := 'plan_completed';
        WHEN 'daily_prayers' THEN 
            v_user_id := NEW.created_by;
            v_couple_id := NEW.couple_space_id;
            v_interaction_type := 'prayer_sent';
        WHEN 'events' THEN 
            v_user_id := NEW.created_by;
            v_couple_id := NEW.couple_space_id;
            v_interaction_type := 'event_created';
        ELSE
            v_user_id := auth.uid();
            SELECT couple_space_id INTO v_couple_id FROM public.members WHERE user_id = v_user_id LIMIT 1;
    END CASE;

    IF v_couple_id IS NULL THEN RETURN NEW; END IF;

    -- A. Registrar Interação Local (Evita duplicados no mesmo minuto para o mesmo tipo)
    INSERT INTO public.interactions (user_id, couple_id, type)
    VALUES (v_user_id, v_couple_id, v_interaction_type);

    RETURN NEW;
END;
$$;

-- 3. Triggers (Remover antigos e criar novos V4)
DROP TRIGGER IF EXISTS tr_record_msg_v4 ON public.messages;
CREATE TRIGGER tr_record_msg_v4 AFTER INSERT ON public.messages FOR EACH ROW EXECUTE FUNCTION public.fn_record_interaction_v4();

DROP TRIGGER IF EXISTS tr_record_mood_v4 ON public.mood_checkins;
CREATE TRIGGER tr_record_mood_v4 AFTER INSERT ON public.mood_checkins FOR EACH ROW EXECUTE FUNCTION public.fn_record_interaction_v4();

DROP TRIGGER IF EXISTS tr_record_task_v4 ON public.tasks;
CREATE TRIGGER tr_record_task_v4 AFTER UPDATE OF status ON public.tasks 
FOR EACH ROW WHEN (NEW.status = 'done') 
EXECUTE FUNCTION public.fn_record_interaction_v4();

DROP TRIGGER IF EXISTS tr_record_photos_v4 ON public.photos;
CREATE TRIGGER tr_record_photos_v4 AFTER INSERT ON public.photos FOR EACH ROW EXECUTE FUNCTION public.fn_record_interaction_v4();

DROP TRIGGER IF EXISTS tr_record_plano_v4 ON public.plano_items;
CREATE TRIGGER tr_record_plano_v4 AFTER INSERT OR UPDATE OF completed ON public.plano_items 
FOR EACH ROW WHEN (NEW.completed = true)
EXECUTE FUNCTION public.fn_record_interaction_v4();

DROP TRIGGER IF EXISTS tr_record_prayers_v4 ON public.daily_prayers;
CREATE TRIGGER tr_record_prayers_v4 AFTER INSERT ON public.daily_prayers FOR EACH ROW EXECUTE FUNCTION public.fn_record_interaction_v4();

DROP TRIGGER IF EXISTS tr_record_events_v4 ON public.events;
CREATE TRIGGER tr_record_events_v4 AFTER INSERT ON public.events FOR EACH ROW EXECUTE FUNCTION public.fn_record_interaction_v4();

-- 4. Re-sincronizar automação de Streak
-- O gatilho tr_interactions_streak_trigger na tabela interactions cuidará do resto
-- via fn_check_streak (definido na migração 20260330000001).

NOTIFY pgrst, 'reload schema';
