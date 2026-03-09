
-- Create tasks table
CREATE TABLE public.tasks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  couple_space_id uuid NOT NULL REFERENCES public.couple_spaces(id),
  created_by uuid NOT NULL,
  assigned_to uuid,
  title text NOT NULL,
  notes text,
  due_date date,
  priority integer NOT NULL DEFAULT 2,
  status text NOT NULL DEFAULT 'open',
  done_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Composite index for listing queries
CREATE INDEX idx_tasks_space_status_due ON public.tasks (couple_space_id, status, due_date, created_at);

-- Enable RLS
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- SELECT: members of the same space
CREATE POLICY "Members can view tasks"
  ON public.tasks FOR SELECT
  USING (public.is_member_of_couple_space(couple_space_id));

-- INSERT: member of space, created_by = self
CREATE POLICY "Members can create tasks"
  ON public.tasks FOR INSERT
  WITH CHECK (public.is_member_of_couple_space(couple_space_id) AND created_by = auth.uid());

-- UPDATE: any member of the space (allows completing/editing)
CREATE POLICY "Members can update tasks"
  ON public.tasks FOR UPDATE
  USING (public.is_member_of_couple_space(couple_space_id));

-- DELETE: any member of the space
CREATE POLICY "Members can delete tasks"
  ON public.tasks FOR DELETE
  USING (public.is_member_of_couple_space(couple_space_id));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
