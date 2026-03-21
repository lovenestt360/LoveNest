-- SCRIPT DE RESTAURAÇÃO FINAL E EXAUSTIVA - LOVENEST
-- Este script repõe absolutamente todas as políticas que foram apagadas pelo CASCADE.
-- Resolve o problema do banner de notificações persistente e outras funções (ciclo, rotinas).

-- 1. Garantir a Função (com o nome original)
CREATE OR REPLACE FUNCTION public.is_member_of_couple_space(_couple_space_id uuid)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public SET row_security = off AS $$
  SELECT EXISTS (SELECT 1 FROM public.members WHERE couple_space_id = _couple_space_id AND user_id = auth.uid());
$$;

-- 2. NOTIFICAÇÕES (Resolve o banner persistente)
DROP POLICY IF EXISTS "Users can manage own subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users can manage own subscriptions" ON public.push_subscriptions
FOR ALL USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid() AND public.is_member_of_couple_space(couple_space_id));

-- 3. ROTINAS
DROP POLICY IF EXISTS "Users can manage routine items" ON public.routine_items;
CREATE POLICY "Users can manage routine items" ON public.routine_items
FOR INSERT WITH CHECK (user_id = auth.uid() AND public.is_member_of_couple_space(couple_space_id));

DROP POLICY IF EXISTS "Users can insert routine logs" ON public.routine_day_logs;
CREATE POLICY "Users can insert routine logs" ON public.routine_day_logs
FOR INSERT WITH CHECK (user_id = auth.uid() AND public.is_member_of_couple_space(couple_space_id));

-- 4. CICLO FEMININO
DROP POLICY IF EXISTS "Owner can insert own cycle profile" ON public.cycle_profiles;
CREATE POLICY "Owner can insert own cycle profile" ON public.cycle_profiles
FOR INSERT WITH CHECK (user_id = auth.uid() AND public.is_member_of_couple_space(couple_space_id));

DROP POLICY IF EXISTS "Owner can insert own period entries" ON public.period_entries;
CREATE POLICY "Owner can insert own period entries" ON public.period_entries
FOR INSERT WITH CHECK (user_id = auth.uid() AND public.is_member_of_couple_space(couple_space_id));

DROP POLICY IF EXISTS "Owner can insert own daily symptoms" ON public.daily_symptoms;
CREATE POLICY "Owner can insert own daily symptoms" ON public.daily_symptoms
FOR INSERT WITH CHECK (user_id = auth.uid() AND public.is_member_of_couple_space(couple_space_id));

-- 5. JEJUM (Fasting)
DROP POLICY IF EXISTS fps_select ON public.fasting_partner_shares;
CREATE POLICY fps_select ON public.fasting_partner_shares
FOR SELECT USING (user_id = auth.uid() OR (couple_space_id IS NOT NULL AND public.is_member_of_couple_space(couple_space_id)));

-- 6. RESTAURAR ATUALIZAÇÕES/REMOÇÕES EM TABELAS PRINCIPAIS (Que podem ter sido perdidas)
DROP POLICY IF EXISTS "Members can update their couple space" ON public.couple_spaces;
CREATE POLICY "Members can update their couple space" ON public.couple_spaces FOR UPDATE USING (public.is_member_of_couple_space(id));

DROP POLICY IF EXISTS "Members can pin messages" ON public.messages;
CREATE POLICY "Members can pin messages" ON public.messages FOR UPDATE USING (public.is_member_of_couple_space(couple_space_id));

DROP POLICY IF EXISTS "Members can update tasks" ON public.tasks;
CREATE POLICY "Members can update tasks" ON public.tasks FOR UPDATE USING (public.is_member_of_couple_space(couple_space_id));

DROP POLICY IF EXISTS "Members can delete tasks" ON public.tasks;
CREATE POLICY "Members can delete tasks" ON public.tasks FOR DELETE USING (public.is_member_of_couple_space(couple_space_id));

DROP POLICY IF EXISTS "Members can update albums" ON public.albums;
CREATE POLICY "Members can update albums" ON public.albums FOR UPDATE USING (public.is_member_of_couple_space(couple_space_id));

DROP POLICY IF EXISTS "Members can delete albums" ON public.albums;
CREATE POLICY "Members can delete albums" ON public.albums FOR DELETE USING (public.is_member_of_couple_space(couple_space_id));

DROP POLICY IF EXISTS "Members can update photos" ON public.photos;
CREATE POLICY "Members can update photos" ON public.photos FOR UPDATE USING (public.is_member_of_couple_space(couple_space_id));

DROP POLICY IF EXISTS "Members can delete photos" ON public.photos;
CREATE POLICY "Members can delete photos" ON public.photos FOR DELETE USING (public.is_member_of_couple_space(couple_space_id));

-- 7. STORAGE (Apagar memórias)
DROP POLICY IF EXISTS "Members can delete memory files" ON storage.objects;
CREATE POLICY "Members can delete memory files" ON storage.objects FOR DELETE USING (bucket_id = 'memories' AND public.is_member_of_couple_space((storage.foldername(name))[1]::uuid));

DO $$ BEGIN RAISE NOTICE 'Restauração Exaustiva Concluída com Sucesso.'; END $$;
