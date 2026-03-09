-- ======================================================
-- DK PWA: Autenticação + Casa DK (limite 2 membros)
-- ======================================================

-- 1) Tabela de perfis (vinculada ao auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  birthday DATE,
  timezone TEXT DEFAULT 'America/Sao_Paulo',
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 2) Tabela couple_spaces (Casa DK)
CREATE TABLE IF NOT EXISTS public.couple_spaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invite_code TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 3) Tabela members (2 membros por couple_space)
CREATE TABLE IF NOT EXISTS public.members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_space_id UUID REFERENCES public.couple_spaces(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  joined_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(couple_space_id, user_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_members_couple_space_id ON public.members(couple_space_id);
CREATE INDEX IF NOT EXISTS idx_members_user_id ON public.members(user_id);

-- ======================================================
-- FUNÇÕES HELPER (Security Definer)
-- ======================================================

-- Obter couple_space_id do utilizador logado
CREATE OR REPLACE FUNCTION public.get_user_couple_space_id()
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT couple_space_id
  FROM public.members
  WHERE user_id = auth.uid()
  LIMIT 1;
$$;

-- Verificar se user_id é membro de couple_space_id
CREATE OR REPLACE FUNCTION public.is_member_of_space(_couple_space_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.members
    WHERE couple_space_id = _couple_space_id
      AND user_id = _user_id
  );
$$;

-- ======================================================
-- RLS POLICIES
-- ======================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.couple_spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;

-- PROFILES: cada user só lê/edita o próprio perfil + pode ler o do parceiro
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can view partner profile" ON public.profiles;
CREATE POLICY "Users can view partner profile"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.members m1
      JOIN public.members m2 ON m1.couple_space_id = m2.couple_space_id
      WHERE m1.user_id = auth.uid()
        AND m2.user_id = public.profiles.user_id
    )
  );

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (user_id = auth.uid());

-- COUPLE_SPACES: apenas membros leem e atualizam (criação via edge function)
DROP POLICY IF EXISTS "Members can view their couple space" ON public.couple_spaces;
CREATE POLICY "Members can view their couple space"
  ON public.couple_spaces FOR SELECT
  USING (public.is_member_of_space(id, auth.uid()));

DROP POLICY IF EXISTS "Members can update their couple space" ON public.couple_spaces;
CREATE POLICY "Members can update their couple space"
  ON public.couple_spaces FOR UPDATE
  USING (public.is_member_of_space(id, auth.uid()));

-- MEMBERS: membros podem ler e criar (inserção própria após convite)
DROP POLICY IF EXISTS "Members can view members of their space" ON public.members;
CREATE POLICY "Members can view members of their space"
  ON public.members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.members m
      WHERE m.user_id = auth.uid()
        AND m.couple_space_id = public.members.couple_space_id
    )
  );

DROP POLICY IF EXISTS "Users can insert themselves as member" ON public.members;
CREATE POLICY "Users can insert themselves as member"
  ON public.members FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- ======================================================
-- TRIGGER: auto-create profile on signup
-- ======================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ======================================================
-- TRIGGER: update updated_at timestamp
-- ======================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
