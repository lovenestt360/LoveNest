-- FIX TASKS RLS: ROBUST POLICIES
-- Este script resolve erros de permissão na tabela de tarefas.

-- 1. Limpar políticas antigas
DROP POLICY IF EXISTS "Members can manage tasks" ON public.tasks;
DROP POLICY IF EXISTS "lovenest_tasks_select_v1" ON public.tasks;
DROP POLICY IF EXISTS "lovenest_tasks_insert_v1" ON public.tasks;
DROP POLICY IF EXISTS "lovenest_tasks_update_v1" ON public.tasks;
DROP POLICY IF EXISTS "lovenest_tasks_delete_v1" ON public.tasks;

-- 2. Garantir RLS ativo
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- 3. SELECT: Ver tarefas do meu espaço
CREATE POLICY "lovenest_tasks_select_v1" ON public.tasks
FOR SELECT TO authenticated
USING (public.is_member_of_couple_space(couple_space_id));

-- 4. INSERT: Criar tarefas no meu espaço
CREATE POLICY "lovenest_tasks_insert_v1" ON public.tasks
FOR INSERT TO authenticated
WITH CHECK (
    public.is_member_of_couple_space(couple_space_id)
    AND (assigned_to IS NULL OR public.is_member_of_couple_space(couple_space_id)) -- Simplificado
);

-- 5. UPDATE: Editar tarefas do meu espaço
CREATE POLICY "lovenest_tasks_update_v1" ON public.tasks
FOR UPDATE TO authenticated
USING (public.is_member_of_couple_space(couple_space_id));

-- 6. DELETE: Remover tarefas do meu espaço
CREATE POLICY "lovenest_tasks_delete_v1" ON public.tasks
FOR DELETE TO authenticated
USING (public.is_member_of_couple_space(couple_space_id));

-- 7. Grant permissions
GRANT ALL ON public.tasks TO authenticated;

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
