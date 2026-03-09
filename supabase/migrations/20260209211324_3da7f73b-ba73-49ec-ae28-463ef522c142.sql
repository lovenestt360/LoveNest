
-- Storage bucket for memories (private)
INSERT INTO storage.buckets (id, name, public) VALUES ('memories', 'memories', false);

-- Storage RLS: members of space can read files in their space folder
CREATE POLICY "Members can read memory files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'memories' AND public.is_member_of_couple_space((storage.foldername(name))[1]::uuid));

CREATE POLICY "Members can upload memory files"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'memories' AND public.is_member_of_couple_space((storage.foldername(name))[1]::uuid));

CREATE POLICY "Members can delete memory files"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'memories' AND public.is_member_of_couple_space((storage.foldername(name))[1]::uuid));

-- Albums table
CREATE TABLE public.albums (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  couple_space_id uuid NOT NULL REFERENCES public.couple_spaces(id),
  title text NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.albums ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view albums"
  ON public.albums FOR SELECT
  USING (public.is_member_of_couple_space(couple_space_id));

CREATE POLICY "Members can create albums"
  ON public.albums FOR INSERT
  WITH CHECK (public.is_member_of_couple_space(couple_space_id) AND created_by = auth.uid());

CREATE POLICY "Members can update albums"
  ON public.albums FOR UPDATE
  USING (public.is_member_of_couple_space(couple_space_id));

CREATE POLICY "Members can delete albums"
  ON public.albums FOR DELETE
  USING (public.is_member_of_couple_space(couple_space_id));

-- Photos table
CREATE TABLE public.photos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  couple_space_id uuid NOT NULL REFERENCES public.couple_spaces(id),
  album_id uuid REFERENCES public.albums(id) ON DELETE SET NULL,
  uploaded_by uuid NOT NULL,
  file_path text NOT NULL,
  caption text,
  taken_on date,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_photos_space_created ON public.photos (couple_space_id, created_at DESC);

ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view photos"
  ON public.photos FOR SELECT
  USING (public.is_member_of_couple_space(couple_space_id));

CREATE POLICY "Members can upload photos"
  ON public.photos FOR INSERT
  WITH CHECK (public.is_member_of_couple_space(couple_space_id) AND uploaded_by = auth.uid());

CREATE POLICY "Members can update photos"
  ON public.photos FOR UPDATE
  USING (public.is_member_of_couple_space(couple_space_id));

CREATE POLICY "Members can delete photos"
  ON public.photos FOR DELETE
  USING (public.is_member_of_couple_space(couple_space_id));

-- Photo comments table
CREATE TABLE public.photo_comments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  photo_id uuid NOT NULL REFERENCES public.photos(id) ON DELETE CASCADE,
  couple_space_id uuid NOT NULL REFERENCES public.couple_spaces(id),
  user_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_photo_comments_photo ON public.photo_comments (photo_id, created_at);

ALTER TABLE public.photo_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view comments"
  ON public.photo_comments FOR SELECT
  USING (public.is_member_of_couple_space(couple_space_id));

CREATE POLICY "Members can create comments"
  ON public.photo_comments FOR INSERT
  WITH CHECK (public.is_member_of_couple_space(couple_space_id) AND user_id = auth.uid());

CREATE POLICY "Members can delete own comments"
  ON public.photo_comments FOR DELETE
  USING (user_id = auth.uid());

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.photos;
ALTER PUBLICATION supabase_realtime ADD TABLE public.photo_comments;
