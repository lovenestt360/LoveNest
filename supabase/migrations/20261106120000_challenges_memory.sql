-- Desafios: ao concluir, o casal pode guardar uma nota e uma foto (fica como memória).
-- A foto vai para o bucket privado "memories" (caminho <couple_space_id>/desafio-<uuid>.<ext>).
-- Idempotente. Aplicar à mão no SQL Editor do Supabase.

ALTER TABLE public.couple_challenges
  ADD COLUMN IF NOT EXISTS memory_note  text,
  ADD COLUMN IF NOT EXISTS memory_photo text;

NOTIFY pgrst, 'reload schema';
