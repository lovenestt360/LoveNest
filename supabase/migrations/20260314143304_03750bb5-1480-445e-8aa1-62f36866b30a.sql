
-- Fix the overly permissive insert policy on love_wrapped
DROP POLICY "Service can insert wrapped" ON public.love_wrapped;

-- Only allow inserts from members (edge function uses service role which bypasses RLS anyway)
CREATE POLICY "Members can insert wrapped" ON public.love_wrapped
  FOR INSERT TO authenticated WITH CHECK (is_member_of_couple_space(couple_space_id));
