-- FIX RLS FOR PHOTOS AND PHOTO_COMMENTS
-- This ensures members can correctly insert and manage their memories.

-- 1. Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Members can view photos" ON public.photos;
DROP POLICY IF EXISTS "Members can upload photos" ON public.photos;
DROP POLICY IF EXISTS "Members can update photos" ON public.photos;
DROP POLICY IF EXISTS "Members can delete photos" ON public.photos;

-- 2. Create optimized policies using SECURITY DEFINER helpers
CREATE POLICY "Allow select for space members" 
ON public.photos FOR SELECT 
TO authenticated 
USING (public.is_member_of_couple_space(couple_space_id));

CREATE POLICY "Allow insert for space members" 
ON public.photos FOR INSERT 
TO authenticated 
WITH CHECK (
  public.is_member_of_couple_space(couple_space_id) 
  AND uploaded_by = auth.uid()
);

CREATE POLICY "Allow update for space members" 
ON public.photos FOR UPDATE 
TO authenticated 
USING (public.is_member_of_couple_space(couple_space_id));

CREATE POLICY "Allow delete for space members" 
ON public.photos FOR DELETE 
TO authenticated 
USING (public.is_member_of_couple_space(couple_space_id));

-- Repeat for comments just in case
DROP POLICY IF EXISTS "Members can view comments" ON public.photo_comments;
DROP POLICY IF EXISTS "Members can create comments" ON public.photo_comments;
DROP POLICY IF EXISTS "Members can delete own comments" ON public.photo_comments;

CREATE POLICY "Allow select comments for space members" 
ON public.photo_comments FOR SELECT 
TO authenticated 
USING (public.is_member_of_couple_space(couple_space_id));

CREATE POLICY "Allow insert comments for space members" 
ON public.photo_comments FOR INSERT 
TO authenticated 
WITH CHECK (
  public.is_member_of_couple_space(couple_space_id) 
  AND user_id = auth.uid()
);

-- Grant permissions explicitly
GRANT ALL ON public.photos TO authenticated;
GRANT ALL ON public.photo_comments TO authenticated;
