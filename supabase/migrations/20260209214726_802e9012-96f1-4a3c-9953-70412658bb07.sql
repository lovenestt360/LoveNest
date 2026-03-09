
-- Table: complaints
CREATE TABLE public.complaints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_space_id uuid NOT NULL REFERENCES public.couple_spaces(id),
  created_by uuid NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  feeling text,
  clear_request text,
  solution_note text,
  severity integer NOT NULL DEFAULT 3,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  CONSTRAINT complaints_severity_check CHECK (severity >= 1 AND severity <= 5)
);

CREATE INDEX idx_complaints_space_status ON public.complaints (couple_space_id, status, created_at DESC);

ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view complaints" ON public.complaints FOR SELECT
  USING (is_member_of_couple_space(couple_space_id));

CREATE POLICY "Members can create complaints" ON public.complaints FOR INSERT
  WITH CHECK (is_member_of_couple_space(couple_space_id) AND created_by = auth.uid());

CREATE POLICY "Members can update complaints" ON public.complaints FOR UPDATE
  USING (is_member_of_couple_space(couple_space_id));

CREATE POLICY "Members can delete complaints" ON public.complaints FOR DELETE
  USING (is_member_of_couple_space(couple_space_id));

-- Table: complaint_messages
CREATE TABLE public.complaint_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id uuid NOT NULL REFERENCES public.complaints(id) ON DELETE CASCADE,
  couple_space_id uuid NOT NULL REFERENCES public.couple_spaces(id),
  user_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_complaint_messages_thread ON public.complaint_messages (complaint_id, created_at);

ALTER TABLE public.complaint_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view messages" ON public.complaint_messages FOR SELECT
  USING (is_member_of_couple_space(couple_space_id));

CREATE POLICY "Members can send messages" ON public.complaint_messages FOR INSERT
  WITH CHECK (is_member_of_couple_space(couple_space_id) AND user_id = auth.uid());

CREATE POLICY "Members can delete own messages" ON public.complaint_messages FOR DELETE
  USING (user_id = auth.uid());

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.complaints;
ALTER PUBLICATION supabase_realtime ADD TABLE public.complaint_messages;
