-- Cria o bucket "photos" para upload de imagens nas cápsulas do tempo
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'photos',
  'photos',
  true,
  10485760, -- 10 MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do nothing;

-- Permite leitura pública de qualquer ficheiro no bucket
create policy "photos_public_read"
  on storage.objects for select
  using (bucket_id = 'photos');

-- Permite upload apenas a utilizadores autenticados
create policy "photos_auth_insert"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'photos');

-- Permite apagar ficheiros a utilizadores autenticados
create policy "photos_auth_delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'photos');
