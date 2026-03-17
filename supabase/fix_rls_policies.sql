-- AJUSTE DE RLS E FUNÇÕES PARA O NINHO
-- Este script corrige o erro de permissão e funções ausentes (RPC).

-- 0. Definição de Funções Auxiliares (RPC e Helpers)
CREATE OR REPLACE FUNCTION public.get_user_couple_space_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public SET row_security = off
AS $$ SELECT couple_space_id FROM public.members WHERE user_id = auth.uid() LIMIT 1; $$;

CREATE OR REPLACE FUNCTION public.is_member_of_couple_space(_couple_space_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public SET row_security = off
AS $$ SELECT EXISTS (SELECT 1 FROM public.members WHERE couple_space_id = _couple_space_id AND user_id = auth.uid()); $$;

CREATE OR REPLACE FUNCTION public.are_users_in_same_couple_space(_other_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public SET row_security = off
AS $$ 
  SELECT EXISTS (
    SELECT 1 FROM public.members me 
    JOIN public.members other ON other.couple_space_id = me.couple_space_id 
    WHERE me.user_id = auth.uid() AND other.user_id = _other_user_id
  ); 
$$;

-- Garantir que utilizadores autenticados podem executar as funções
GRANT EXECUTE ON FUNCTION public.get_user_couple_space_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_member_of_couple_space(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.are_users_in_same_couple_space(uuid) TO authenticated;


-- 1. Permissões para a tabela couple_spaces
DROP POLICY IF EXISTS "Members can view their couple space" ON public.couple_spaces;
DROP POLICY IF EXISTS "Members can update their couple space" ON public.couple_spaces;
DROP POLICY IF EXISTS "Public can insert couple spaces" ON public.couple_spaces;
DROP POLICY IF EXISTS "Anyone with invite code can view" ON public.couple_spaces;
DROP POLICY IF EXISTS "Allow insert for authenticated" ON public.couple_spaces;
DROP POLICY IF EXISTS "Allow select for authenticated" ON public.couple_spaces;
DROP POLICY IF EXISTS "Allow update for members" ON public.couple_spaces;

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
DROP POLICY IF EXISTS "Allow select for members" ON public.members;
DROP POLICY IF EXISTS "Allow select for members or self" ON public.members;
DROP POLICY IF EXISTS "Allow insert for self" ON public.members;

-- Permitir ver membros se for do mesmo ninho ou for o próprio usuário
CREATE POLICY "Allow select for members or self" 
ON public.members FOR SELECT 
TO authenticated 
USING (public.is_member_of_couple_space(couple_space_id) OR user_id = auth.uid());

-- Permitir inserir-se num ninho (join ou create)
CREATE POLICY "Allow insert for self" 
ON public.members FOR INSERT 
TO authenticated 
WITH CHECK (user_id = auth.uid());


-- 3. Permissões para a tabela messages
DROP POLICY IF EXISTS "Members can view messages" ON public.messages;
DROP POLICY IF EXISTS "Members can send messages" ON public.messages;
DROP POLICY IF EXISTS "Allow select for members" ON public.messages;
DROP POLICY IF EXISTS "Allow insert for members" ON public.messages;

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
