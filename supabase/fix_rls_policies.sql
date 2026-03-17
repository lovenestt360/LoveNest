-- AJUSTE DE RLS PARA CRIAÇÃO E CONSULTA DE NINHOS
-- Este script corrige o erro de permissão ao criar ou entrar num LoveNest.

-- 1. Permissões para a tabela couple_spaces
DROP POLICY IF EXISTS "Members can view their couple space" ON public.couple_spaces;
DROP POLICY IF EXISTS "Members can update their couple space" ON public.couple_spaces;
DROP POLICY IF EXISTS "Public can insert couple spaces" ON public.couple_spaces;
DROP POLICY IF EXISTS "Anyone with invite code can view" ON public.couple_spaces;

-- Permitir que qualquer utilizador autenticado crie um espaço
CREATE POLICY "Allow insert for authenticated" 
ON public.couple_spaces FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- IMPORTANTE: Permitir que utilizadores vejam espaços (necessário para o processo de criação e join)
CREATE POLICY "Allow select for authenticated" 
ON public.couple_spaces FOR SELECT 
TO authenticated 
USING (true);

-- Permitir que membros atualizem o seu próprio espaço
CREATE POLICY "Allow update for members" 
ON public.couple_spaces FOR UPDATE 
TO authenticated 
USING (public.is_member_of_couple_space(id));


-- 2. Permissões para a tabela members
DROP POLICY IF EXISTS "Members can view members of their space" ON public.members;
DROP POLICY IF EXISTS "Users can join spaces" ON public.members;

-- Permitir ver membros se for do mesmo ninho
CREATE POLICY "Allow select for members" 
ON public.members FOR SELECT 
TO authenticated 
USING (public.is_member_of_couple_space(couple_space_id));

-- Permitir inserir-se num ninho (join ou create)
CREATE POLICY "Allow insert for self" 
ON public.members FOR INSERT 
TO authenticated 
WITH CHECK (user_id = auth.uid());


-- 3. Permissões para a tabela messages
DROP POLICY IF EXISTS "Members can view messages" ON public.messages;
DROP POLICY IF EXISTS "Members can send messages" ON public.messages;

-- Permitir ver mensagens se for do mesmo ninho
CREATE POLICY "Allow select for members" 
ON public.messages FOR SELECT 
TO authenticated 
USING (public.is_member_of_couple_space(couple_space_id));

-- Permitir enviar mensagens
CREATE POLICY "Allow insert for members" 
ON public.messages FOR INSERT 
TO authenticated 
WITH CHECK (public.is_member_of_couple_space(couple_space_id) AND sender_user_id = auth.uid());


-- 4. Garantir permissões básicas aos papéis do Supabase
GRANT ALL ON public.couple_spaces TO authenticated;
GRANT ALL ON public.members TO authenticated;
GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.messages TO authenticated;
