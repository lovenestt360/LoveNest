-- love_shields nao estava na publicacao supabase_realtime.
-- REPLICA IDENTITY FULL e necessario para o filtro por couple_space_id
-- funcionar em eventos UPDATE (sem ele so ha NEW, sem OLD).
ALTER TABLE public.love_shields REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.love_shields;
