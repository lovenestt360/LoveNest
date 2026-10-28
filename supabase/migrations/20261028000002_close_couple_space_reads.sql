-- Fase B — aplicar SÓ DEPOIS de o frontend que usa create_couple_space /
-- join_couple_space estar em produção (a versão antiga lê e insere direto).

-- Qualquer conta lia todas as casas: códigos de convite, subscrição, nomes.
-- Cada membro continua a ver a sua ("Members can view their couple space");
-- o admin usa "Admins bypass RLS couple_spaces"; o ranking usa get_ranking().
DROP POLICY IF EXISTS "Allow select for authenticated" ON public.couple_spaces;
DROP POLICY IF EXISTS "Public can view house names for ranking" ON public.couple_spaces;

-- Criar casa passa só por create_couple_space().
DROP POLICY IF EXISTS "Allow insert for authenticated" ON public.couple_spaces;
REVOKE INSERT ON public.couple_spaces FROM authenticated, anon;

-- Qualquer conta podia inserir-se como membro de qualquer casa, sem código.
-- Entrar passa só por create_couple_space() / join_couple_space().
DROP POLICY IF EXISTS "Users can insert themselves as member" ON public.members;
DROP POLICY IF EXISTS "Allow insert for self" ON public.members;
