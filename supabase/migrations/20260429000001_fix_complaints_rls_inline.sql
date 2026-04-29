-- Fix: replace is_member_of_couple_space() calls in complaints RLS with inline EXISTS
-- The SECURITY DEFINER function was losing auth.uid() context inside policies

DROP POLICY IF EXISTS "Members can view complaints" ON public.complaints;
DROP POLICY IF EXISTS "Members can create complaints" ON public.complaints;
DROP POLICY IF EXISTS "Members can update complaints" ON public.complaints;
DROP POLICY IF EXISTS "Members can delete complaints" ON public.complaints;
DROP POLICY IF EXISTS "Members can view complaint messages" ON public.complaint_messages;
DROP POLICY IF EXISTS "Members can send complaint messages" ON public.complaint_messages;
DROP POLICY IF EXISTS "Members can delete own complaint messages" ON public.complaint_messages;

CREATE POLICY "Members can view complaints" ON public.complaints
FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.members WHERE couple_space_id = complaints.couple_space_id AND user_id = auth.uid())
);

CREATE POLICY "Members can create complaints" ON public.complaints
FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.members WHERE couple_space_id = complaints.couple_space_id AND user_id = auth.uid())
);

CREATE POLICY "Members can update complaints" ON public.complaints
FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.members WHERE couple_space_id = complaints.couple_space_id AND user_id = auth.uid())
);

CREATE POLICY "Members can delete complaints" ON public.complaints
FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.members WHERE couple_space_id = complaints.couple_space_id AND user_id = auth.uid())
);

CREATE POLICY "Members can view complaint messages" ON public.complaint_messages
FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.members WHERE couple_space_id = complaint_messages.couple_space_id AND user_id = auth.uid())
);

CREATE POLICY "Members can send complaint messages" ON public.complaint_messages
FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.members WHERE couple_space_id = complaint_messages.couple_space_id AND user_id = auth.uid())
);

CREATE POLICY "Members can delete own complaint messages" ON public.complaint_messages
FOR DELETE USING (user_id = auth.uid());
