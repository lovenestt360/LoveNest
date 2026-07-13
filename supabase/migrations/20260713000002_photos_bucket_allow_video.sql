-- Adiciona tipos de vídeo ao bucket photos (cápsulas do tempo)
update storage.buckets
set
  allowed_mime_types = array[
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'video/mp4', 'video/webm', 'video/quicktime'
  ],
  file_size_limit = 104857600 -- 100 MB para acomodar vídeos
where id = 'photos';
