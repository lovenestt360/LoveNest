-- SCRIPT DE RESTAURAÇÃO DE EMERGÊNCIA - LOVENEST
-- Este script restaura todas as políticas de segurança apagadas acidentalmente.

-- 1. Restaurar a Função Auxiliar (sem CASCADE desta vez)
CREATE OR REPLACE FUNCTION public.is_member_of_couple_space(_couple_space_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path = public
 SET row_security = off
 AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.members
    WHERE couple_space_id = _couple_space_id
      AND user_id = auth.uid()
  );
$$;

-- 2. Restaurar Políticas de Couple Spaces
DROP POLICY IF EXISTS "Members can view their couple space" ON public.couple_spaces;
CREATE POLICY "Members can view their couple space" ON public.couple_spaces FOR SELECT USING (public.is_member_of_couple_space(id));

DROP POLICY IF EXISTS "Members can update their couple space" ON public.couple_spaces;
CREATE POLICY "Members can update their couple space" ON public.couple_spaces FOR UPDATE USING (public.is_member_of_couple_space(id));

-- 3. Restaurar Políticas de Members
DROP POLICY IF EXISTS "Members can view members of their space" ON public.members;
CREATE POLICY "Members can view members of their space" ON public.members FOR SELECT USING (public.is_member_of_couple_space(couple_space_id));

-- 4. Restaurar Políticas de Mensagens
DROP POLICY IF EXISTS "Members can view messages" ON public.messages;
CREATE POLICY "Members can view messages" ON public.messages FOR SELECT USING (public.is_member_of_couple_space(couple_space_id));

DROP POLICY IF EXISTS "Members can send messages" ON public.messages;
CREATE POLICY "Members can send messages" ON public.messages FOR INSERT WITH CHECK (public.is_member_of_couple_space(couple_space_id) AND sender_user_id = auth.uid());

DROP POLICY IF EXISTS "Members can pin messages" ON public.messages;
CREATE POLICY "Members can pin messages" ON public.messages FOR UPDATE USING (public.is_member_of_couple_space(couple_space_id));

-- 5. Restaurar Políticas de Mood
DROP POLICY IF EXISTS "Members can view mood checkins" ON public.mood_checkins;
CREATE POLICY "Members can view mood checkins" ON public.mood_checkins FOR SELECT USING (public.is_member_of_couple_space(couple_space_id));

DROP POLICY IF EXISTS "Users can insert own mood checkin" ON public.mood_checkins;
CREATE POLICY "Users can insert own mood checkin" ON public.mood_checkins FOR INSERT WITH CHECK (public.is_member_of_couple_space(couple_space_id) AND user_id = auth.uid());

-- 6. Restaurar Políticas de Tasks
DROP POLICY IF EXISTS "Members can view tasks" ON public.tasks;
CREATE POLICY "Members can view tasks" ON public.tasks FOR SELECT USING (public.is_member_of_couple_space(couple_space_id));

DROP POLICY IF EXISTS "Members can create tasks" ON public.tasks;
CREATE POLICY "Members can create tasks" ON public.tasks FOR INSERT WITH CHECK (public.is_member_of_couple_space(couple_space_id) AND created_by = auth.uid());

DROP POLICY IF EXISTS "Members can update tasks" ON public.tasks;
CREATE POLICY "Members can update tasks" ON public.tasks FOR UPDATE USING (public.is_member_of_couple_space(couple_space_id));

DROP POLICY IF EXISTS "Members can delete tasks" ON public.tasks;
CREATE POLICY "Members can delete tasks" ON public.tasks FOR DELETE USING (public.is_member_of_couple_space(couple_space_id));

-- 7. Restaurar Políticas de Álbuns e Fotos
DROP POLICY IF EXISTS "Members can view albums" ON public.albums;
CREATE POLICY "Members can view albums" ON public.albums FOR SELECT USING (public.is_member_of_couple_space(couple_space_id));

DROP POLICY IF EXISTS "Members can create albums" ON public.albums;
CREATE POLICY "Members can create albums" ON public.albums FOR INSERT WITH CHECK (public.is_member_of_couple_space(couple_space_id) AND created_by = auth.uid());

DROP POLICY IF EXISTS "Members can view photos" ON public.photos;
CREATE POLICY "Members can view photos" ON public.photos FOR SELECT USING (public.is_member_of_couple_space(couple_space_id));

DROP POLICY IF EXISTS "Members can upload photos" ON public.photos;
CREATE POLICY "Members can upload photos" ON public.photos FOR INSERT WITH CHECK (public.is_member_of_couple_space(couple_space_id) AND uploaded_by = auth.uid());

DROP POLICY IF EXISTS "Members can view comments" ON public.photo_comments;
CREATE POLICY "Members can view comments" ON public.photo_comments FOR SELECT USING (public.is_member_of_couple_space(couple_space_id));

DROP POLICY IF EXISTS "Members can create comments" ON public.photo_comments;
CREATE POLICY "Members can create comments" ON public.photo_comments FOR INSERT WITH CHECK (public.is_member_of_couple_space(couple_space_id) AND user_id = auth.uid());

-- 8. Restaurar Políticas de Agenda e Eventos
DROP POLICY IF EXISTS "Members can view schedule blocks" ON public.schedule_blocks;
CREATE POLICY "Members can view schedule blocks" ON public.schedule_blocks FOR SELECT USING (public.is_member_of_couple_space(couple_space_id));

DROP POLICY IF EXISTS "Members can view events" ON public.events;
CREATE POLICY "Members can view events" ON public.events FOR SELECT USING (public.is_member_of_couple_space(couple_space_id));

-- 9. Restaurar Políticas de Orações e Logs Espirituais
DROP POLICY IF EXISTS "Members can view prayers" ON public.daily_prayers;
CREATE POLICY "Members can view prayers" ON public.daily_prayers FOR SELECT USING (public.is_member_of_couple_space(couple_space_id));

DROP POLICY IF EXISTS "Members can view logs" ON public.daily_spiritual_logs;
CREATE POLICY "Members can view logs" ON public.daily_spiritual_logs FOR SELECT USING (public.is_member_of_couple_space(couple_space_id));

-- 10. Restaurar Políticas de Reclamações (Complaints)
DROP POLICY IF EXISTS "Members can view complaints" ON public.complaints;
CREATE POLICY "Members can view complaints" ON public.complaints FOR SELECT USING (public.is_member_of_couple_space(couple_space_id));

DROP POLICY IF EXISTS "Members can view complaint messages" ON public.complaint_messages;
CREATE POLICY "Members can view complaint messages" ON public.complaint_messages FOR SELECT USING (public.is_member_of_couple_space(couple_space_id));

-- 11. Restaurar Políticas de Rotina e Ciclo
DROP POLICY IF EXISTS "Users can manage routine items" ON public.routine_items;
CREATE POLICY "Users can manage routine items" ON public.routine_items FOR INSERT WITH CHECK (user_id = auth.uid() AND public.is_member_of_couple_space(couple_space_id));

DROP POLICY IF EXISTS "Users can insert routine logs" ON public.routine_day_logs;
CREATE POLICY "Users can insert routine logs" ON public.routine_day_logs FOR INSERT WITH CHECK (user_id = auth.uid() AND public.is_member_of_couple_space(couple_space_id));

DROP POLICY IF EXISTS "Owner can insert own cycle profile" ON public.cycle_profiles;
CREATE POLICY "Owner can insert own cycle profile" ON public.cycle_profiles FOR INSERT WITH CHECK (user_id = auth.uid() AND public.is_member_of_couple_space(couple_space_id));

-- 12. Restaurar Políticas de Storage (Memórias)
DROP POLICY IF EXISTS "Members can read memory files" ON storage.objects;
CREATE POLICY "Members can read memory files" ON storage.objects FOR SELECT USING (bucket_id = 'memories' AND public.is_member_of_couple_space((storage.foldername(name))[1]::uuid));

DROP POLICY IF EXISTS "Members can upload memory files" ON storage.objects;
CREATE POLICY "Members can upload memory files" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'memories' AND public.is_member_of_couple_space((storage.foldername(name))[1]::uuid));

-- FINAL: Notificar sucesso no log
DO $$ BEGIN RAISE NOTICE 'Restauração completa de políticas RLS concluída.'; END $$;
