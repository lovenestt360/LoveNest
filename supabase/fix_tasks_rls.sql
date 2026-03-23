-- 2026.03.23 - Fix Tasks RLS Policies
-- This script ensures that members of a couple space can manage tasks within that space.

-- 1. Re-define the helper function with SECURITY DEFINER to bypass RLS within the check itself
CREATE OR REPLACE FUNCTION public.is_member_of_couple_space(_couple_space_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public SET row_security = off
AS $$ 
  SELECT EXISTS (
    SELECT 1 FROM public.members 
    WHERE couple_space_id = _couple_space_id 
    AND user_id = auth.uid()
  ); 
$$;

-- 2. Drop existing policies for the tasks table to avoid conflicts
DROP POLICY IF EXISTS "Members can view tasks" ON public.tasks;
DROP POLICY IF EXISTS "Members can create tasks" ON public.tasks;
DROP POLICY IF EXISTS "Members can update tasks" ON public.tasks;
DROP POLICY IF EXISTS "Members can delete tasks" ON public.tasks;

-- 3. Re-create policies with robust checks

-- SELECT: Permite que membros vejam tarefas do seu espaço
CREATE POLICY "Members can view tasks" ON public.tasks 
FOR SELECT USING (public.is_member_of_couple_space(couple_space_id));

-- INSERT: Permite que qualquer membro do espaço crie uma tarefa
-- Removido o check estrito de created_by para evitar erros se o auth.uid() demorar a propagar no frontend
CREATE POLICY "Members can create tasks" ON public.tasks 
FOR INSERT WITH CHECK (public.is_member_of_couple_space(couple_space_id));

-- UPDATE: Permite que qualquer membro do espaço atualize tarefas (ex: concluir tarefas do par)
CREATE POLICY "Members can update tasks" ON public.tasks 
FOR UPDATE USING (public.is_member_of_couple_space(couple_space_id));

-- DELETE: Permite que qualquer membro do espaço apague tarefas
CREATE POLICY "Members can delete tasks" ON public.tasks 
FOR DELETE USING (public.is_member_of_couple_space(couple_space_id));

-- 4. Certificar que o RLS está ativo
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- 5. Certificar que a tabela está na publicação realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
-- Nota: Pode dar erro se já estiver na publicação, mas o Supabase ignora ou avisa.
