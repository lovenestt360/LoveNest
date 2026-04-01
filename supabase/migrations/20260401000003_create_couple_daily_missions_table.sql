-- 1. CRIAR TABELA DE ATRIBUIÇÃO DE MISSÕES DIÁRIAS
CREATE TABLE IF NOT EXISTS public.couple_daily_missions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    couple_space_id UUID REFERENCES public.couple_spaces(id) ON DELETE CASCADE NOT NULL,
    mission_id UUID REFERENCES public.love_missions(id) ON DELETE CASCADE NOT NULL,
    assignment_date DATE DEFAULT CURRENT_DATE NOT NULL,
    UNIQUE(couple_space_id, mission_id, assignment_date)
);

-- 2. HABILITAR RLS
ALTER TABLE public.couple_daily_missions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Casais podem ver as suas missões atribuídas"
    ON public.couple_daily_missions FOR SELECT
    USING (
        couple_space_id IN (
            SELECT couple_space_id FROM public.members WHERE user_id = auth.uid()
        )
    );

-- 3. PERMISSÃO DE INSERT PARA O MOTOR (SECURITY DEFINER já trata disso no RPC, mas por segurança)
CREATE POLICY "Admins/Service can manage daily missions"
    ON public.couple_daily_missions FOR ALL
    USING (true)
    WITH CHECK (true);
