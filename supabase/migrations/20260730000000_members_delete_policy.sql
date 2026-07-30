-- Fix: add DELETE policy on members table so users can leave their own couple space.
-- Without this, RLS silently blocks the delete (0 rows, no error), leaving the user
-- still paired and causing the "O vosso espaço está completo" redirect loop.

CREATE POLICY "Members can leave their own space"
ON public.members
FOR DELETE
USING (user_id = auth.uid());
