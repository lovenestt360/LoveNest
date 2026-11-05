-- Cápsula do Tempo: "Para quem". Vazio = para os dois (como antes).
-- Com destinatário, só essa pessoa a abre; quem escreveu espera que o outro a abra.
-- Idempotente. Aplicar à mão no SQL Editor do Supabase.

ALTER TABLE public.time_capsule_messages
  ADD COLUMN IF NOT EXISTS recipient_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

NOTIFY pgrst, 'reload schema';
