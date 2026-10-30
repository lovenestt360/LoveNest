-- Áudios/imagens do chat e fotos das cápsulas passam a privados.
-- APLICAR SÓ DEPOIS de a app com links assinados (src/lib/privateMedia.ts)
-- estar em produção — a versão anterior usa os URLs públicos diretamente.
-- Idempotente. Aplicar à mão no SQL Editor do Supabase.

-- ── chat-media ─────────────────────────────────────────────────────────────
-- Antes: bucket público + "Anyone can view chat media" — qualquer pessoa, sem
-- conta, listava e ouvia/abria os ficheiros do chat de todas as casas.
-- Agora: quem enviou, ou um membro da casa onde a mensagem está.
UPDATE storage.buckets SET public = false WHERE id = 'chat-media';

DROP POLICY IF EXISTS "Anyone can view chat media" ON storage.objects;
DROP POLICY IF EXISTS "Couple members can view chat media" ON storage.objects;
CREATE POLICY "Couple members can view chat media" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'chat-media'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR EXISTS (
        SELECT 1 FROM public.messages m
        WHERE public.is_member_of_couple_space(m.couple_space_id)
          AND (m.image_url LIKE '%/chat-media/' || storage.objects.name
               OR m.audio_url LIKE '%/chat-media/' || storage.objects.name
               OR m.image_url = storage.objects.name
               OR m.audio_url = storage.objects.name)
      )
    )
  );

-- ── photos (cápsulas do tempo) ─────────────────────────────────────────────
-- Antes: bucket público + "photos_public_read". Agora: quem carregou, ou um
-- membro da casa dona da cápsula.
UPDATE storage.buckets SET public = false WHERE id = 'photos';

DROP POLICY IF EXISTS "photos_public_read" ON storage.objects;
DROP POLICY IF EXISTS "Capsule members can view photos" ON storage.objects;
CREATE POLICY "Capsule members can view photos" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'photos'
    AND (
      owner = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.time_capsule_messages t
        WHERE public.is_member_of_couple_space(t.couple_space_id)
          AND (t.image_url LIKE '%/photos/' || storage.objects.name
               OR t.image_url = storage.objects.name)
      )
    )
  );
