
-- Create messages table
CREATE TABLE IF NOT EXISTS public.messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  couple_space_id uuid NOT NULL REFERENCES public.couple_spaces(id) ON DELETE CASCADE,
  sender_user_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Index for efficient queries
CREATE INDEX IF NOT EXISTS idx_messages_space_created ON public.messages (couple_space_id, created_at);

-- Enable RLS
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- SELECT: only members of the couple_space
DROP POLICY IF EXISTS "Members can view messages" ON public.messages;
CREATE POLICY "Members can view messages"
ON public.messages
FOR SELECT
USING (public.is_member_of_couple_space(couple_space_id));

-- INSERT: only members, and sender_user_id must match auth.uid()
DROP POLICY IF EXISTS "Members can send messages" ON public.messages;
CREATE POLICY "Members can send messages"
ON public.messages
FOR INSERT
WITH CHECK (
  public.is_member_of_couple_space(couple_space_id)
  AND sender_user_id = auth.uid()
);

-- No UPDATE or DELETE in MVP

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
