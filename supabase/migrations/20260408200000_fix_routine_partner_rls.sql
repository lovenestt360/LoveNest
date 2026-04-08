-- ============================================================
-- FIX: RLS routine_items e routine_day_logs para visibilidade do parceiro
-- Problema: couple_space_id NULL em routine_items impede a policy
-- "are_users_in_same_couple_space" de funcionar.
-- Solução: política mais robusta usando is_member_of_couple_space
-- OU verificação direta via members table.
-- ============================================================

-- 1. Atualizar couple_space_id NULL nos routine_items existentes
--    (preenche com o couple_space_id do utilizador via members)
UPDATE public.routine_items ri
SET couple_space_id = m.couple_space_id
FROM public.members m
WHERE m.user_id = ri.user_id
  AND ri.couple_space_id IS NULL;

-- 2. Atualizar couple_space_id NULL nos routine_day_logs existentes
UPDATE public.routine_day_logs rdl
SET couple_space_id = m.couple_space_id
FROM public.members m
WHERE m.user_id = rdl.user_id
  AND rdl.couple_space_id IS NULL;

-- 3. Recriar policy de SELECT em routine_items com lógica mais robusta
DROP POLICY IF EXISTS "Users can view routine items"     ON public.routine_items;
DROP POLICY IF EXISTS "Partner can view routine items"   ON public.routine_items;
DROP POLICY IF EXISTS "Owner can view own routine items" ON public.routine_items;

-- Nova policy: o próprio dono OU membro do mesmo casal (via couple_space_id ou via members)
CREATE POLICY "Members can view routine items"
ON public.routine_items
FOR SELECT
USING (
    user_id = auth.uid()
    OR (
        couple_space_id IS NOT NULL
        AND public.is_member_of_couple_space(couple_space_id)
    )
    OR (
        -- Fallback: verifica via members se couple_space_id ainda for NULL
        EXISTS (
            SELECT 1
            FROM public.members m1
            JOIN public.members m2 ON m1.couple_space_id = m2.couple_space_id
            WHERE m1.user_id = auth.uid()
              AND m2.user_id = routine_items.user_id
        )
    )
);

-- 4. Recriar policy de SELECT em routine_day_logs com lógica mais robusta
DROP POLICY IF EXISTS "Users can view routine logs"      ON public.routine_day_logs;
DROP POLICY IF EXISTS "Partner can view routine logs"    ON public.routine_day_logs;
DROP POLICY IF EXISTS "Owner can view own routine logs"  ON public.routine_day_logs;

CREATE POLICY "Members can view routine logs"
ON public.routine_day_logs
FOR SELECT
USING (
    user_id = auth.uid()
    OR (
        couple_space_id IS NOT NULL
        AND public.is_member_of_couple_space(couple_space_id)
    )
    OR (
        -- Fallback: verifica via members se couple_space_id ainda for NULL
        EXISTS (
            SELECT 1
            FROM public.members m1
            JOIN public.members m2 ON m1.couple_space_id = m2.couple_space_id
            WHERE m1.user_id = auth.uid()
              AND m2.user_id = routine_day_logs.user_id
        )
    )
);

-- 5. Recarregar schema
NOTIFY pgrst, 'reload schema';
