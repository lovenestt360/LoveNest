-- ============================================================
-- Chat avançado: novas colunas para reply, edit, delete, media, pin
-- ============================================================

-- 1. Novas colunas
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS reply_to_id  uuid REFERENCES public.messages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS image_url    text,
  ADD COLUMN IF NOT EXISTS audio_url    text,
  ADD COLUMN IF NOT EXISTS is_pinned    boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_edited    boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_deleted   boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS updated_at   timestamptz NOT NULL DEFAULT now();

-- 2. RLS: UPDATE policy (sender can edit their own messages)
DROP POLICY IF EXISTS "Sender can update own messages" ON public.messages;
CREATE POLICY "Sender can update own messages"
ON public.messages
FOR UPDATE
USING (sender_user_id = auth.uid())
WITH CHECK (sender_user_id = auth.uid());

-- 3. RLS: DELETE policy (sender can delete their own messages)
DROP POLICY IF EXISTS "Sender can delete own messages" ON public.messages;
CREATE POLICY "Sender can delete own messages"
ON public.messages
FOR DELETE
USING (sender_user_id = auth.uid());

-- 4. Pin policy: any couple member can pin/unpin
-- (already covered by UPDATE policy above if sender matches;
--  we add a separate policy for partner to pin)
DROP POLICY IF EXISTS "Members can pin messages" ON public.messages;
CREATE POLICY "Members can pin messages"
ON public.messages
FOR UPDATE
USING (public.is_member_of_couple_space(couple_space_id));

-- 5. Storage bucket for chat media (images + audio)
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-media', 'chat-media', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
DROP POLICY IF EXISTS "Couple members can upload chat media" ON storage.objects;
CREATE POLICY "Couple members can upload chat media"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'chat-media'
  AND auth.uid() IS NOT NULL
);

DROP POLICY IF EXISTS "Anyone can view chat media" ON storage.objects;
CREATE POLICY "Anyone can view chat media"
ON storage.objects FOR SELECT
USING (bucket_id = 'chat-media');

DROP POLICY IF EXISTS "Owner can delete chat media" ON storage.objects;
CREATE POLICY "Owner can delete chat media"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'chat-media'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- 6. Realtime for UPDATE events too
-- (already part of supabase_realtime from initial migration)
