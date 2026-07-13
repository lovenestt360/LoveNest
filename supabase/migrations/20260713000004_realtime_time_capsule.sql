-- Activa Realtime na tabela time_capsule_messages
-- REPLICA IDENTITY FULL é necessário para que eventos DELETE incluam
-- os dados da linha apagada (permite filtragem por couple_space_id).
ALTER TABLE public.time_capsule_messages REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.time_capsule_messages;
