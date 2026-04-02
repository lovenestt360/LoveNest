-- ============================================================
-- UNIFICAÇÃO NUCLEAR DE ARQUITETURA — STREAKS V5
-- Objetivo: Migrar love_streaks -> streaks e consolidar triggers.
-- ============================================================

-- 1. MIGRAR TABELA (Se love_streaks ainda existir e streaks não)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'love_streaks') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'streaks') THEN
            ALTER TABLE public.love_streaks RENAME TO streaks;
            ALTER TABLE public.streaks RENAME COLUMN couple_space_id TO couple_id;
        ELSE
            -- Se ambas existirem, fundir ou apenas dropar a antiga se a nova estiver populada
            DROP TABLE IF EXISTS public.love_streaks CASCADE;
        END IF;
    END IF;
END $$;

-- 2. GARANTIR ESTRUTURA DA TABELA STREAKS
CREATE TABLE IF NOT EXISTS public.streaks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    couple_id UUID NOT NULL REFERENCES public.couple_spaces(id) ON DELETE CASCADE,
    current_streak INTEGER DEFAULT 0 NOT NULL,
    last_valid_day DATE,
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(couple_id)
);

-- RLS
ALTER TABLE public.streaks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view streaks" ON public.streaks;
CREATE POLICY "Anyone can view streaks" ON public.streaks FOR SELECT USING (true);

-- 3. MOTOR DE ATUALIZAÇÃO AUTOMÁTICA (V5)
CREATE OR REPLACE FUNCTION public.fn_update_streak_v5()
RETURNS TRIGGER AS $$
DECLARE
    v_last_valid DATE;
    v_current_streak INTEGER;
    v_today DATE := CURRENT_DATE;
BEGIN
    -- Obter estado atual
    SELECT last_valid_day, current_streak 
    INTO v_last_valid, v_current_streak
    FROM public.streaks 
    WHERE couple_id = NEW.couple_id;

    -- Se não existir registo, criar
    IF NOT FOUND THEN
        INSERT INTO public.streaks (couple_id, current_streak, last_valid_day)
        VALUES (NEW.couple_id, 1, v_today);
        RETURN NEW;
    END IF;

    -- Lógica de incremento
    IF v_last_valid = v_today THEN
        -- Já atualizado hoje, não faz nada
        NULL;
    ELSIF v_last_valid = (v_today - INTERVAL '1 day')::DATE THEN
        -- Dia consecutivo: incrementa
        UPDATE public.streaks 
        SET current_streak = v_current_streak + 1,
            last_valid_day = v_today,
            updated_at = now()
        WHERE couple_id = NEW.couple_id;
    ELSE
        -- Quebrou a streak: reseta para 1
        UPDATE public.streaks 
        SET current_streak = 1,
            last_valid_day = v_today,
            updated_at = now()
        WHERE couple_id = NEW.couple_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- GATILHO NA DAILY_ACTIVITY
DROP TRIGGER IF EXISTS tr_update_streak_on_activity ON public.daily_activity;
CREATE TRIGGER tr_update_streak_on_activity
AFTER INSERT ON public.daily_activity
FOR EACH ROW
EXECUTE FUNCTION public.fn_update_streak_v5();

-- 4. ATUALIZAR RPC DE RANKING PARA A NOVA TABELA
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
            COALESCE((SELECT SUM(points) FROM public.love_points lp WHERE lp.couple_space_id = s.couple_id), 0)::BIGINT as total_points,
            cs.house_name,
            cs.house_image,
            cs.is_verified
        FROM public.streaks s
        JOIN public.couple_spaces cs ON s.couple_id = cs.id
        ORDER BY total_points DESC NULLS LAST, s.current_streak DESC
        LIMIT 50;
    ELSE
        RETURN QUERY
        SELECT 
            s.couple_id,
            s.current_streak,
            COALESCE((SELECT SUM(points) FROM public.love_points lp WHERE lp.couple_space_id = s.couple_id), 0)::BIGINT as total_points,
            cs.house_name,
            cs.house_image,
            cs.is_verified
        FROM public.streaks s
        JOIN public.couple_spaces cs ON s.couple_id = cs.id
        ORDER BY s.current_streak DESC NULLS LAST, total_points DESC
        LIMIT 50;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
