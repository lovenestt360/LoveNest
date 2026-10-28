-- Fecha permissões de escrita abertas encontradas em produção (2026-10-28).
-- Cada alteração mantém o caminho que a app usa hoje; idempotente.

-- 1. messages: "Allow insert for members" aceitava qualquer linha (WITH CHECK true),
--    permitindo escrever no chat de outra casa em nome de outra pessoa.
--    "Members can send messages" (membro + sender_user_id = auth.uid()) já cobre o Chat.
DROP POLICY IF EXISTS "Allow insert for members" ON public.messages;

-- 2. payments: qualquer utilizador podia inserir um pagamento já "approved"
--    e para qualquer casa. O cliente só envia comprovativos 'pending' da própria casa.
DROP POLICY IF EXISTS "Authenticated can insert payments" ON public.payments;
DROP POLICY IF EXISTS "Members insert pending payments" ON public.payments;
CREATE POLICY "Members insert pending payments" ON public.payments
  FOR INSERT TO authenticated
  WITH CHECK (public.is_member_of_couple_space(couple_space_id) AND status = 'pending');

-- 3. feature_flags: qualquer utilizador podia criar, mudar ou apagar flags.
--    Leitura continua aberta a autenticados (FeatureAccessContext); escrita só admin.
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.feature_flags;
DROP POLICY IF EXISTS "Authenticated can read feature flags" ON public.feature_flags;
DROP POLICY IF EXISTS "Admins manage feature flags" ON public.feature_flags;
CREATE POLICY "Authenticated can read feature flags" ON public.feature_flags
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage feature flags" ON public.feature_flags
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 4. couple_spaces: o INSERT direto (CoupleSpace.tsx só envia invite_code) aceitava
--    também subscription_status, tier_level, trial_ends_at, etc. — subscrição grátis.
--    Restringe as colunas inseríveis às de perfil da casa; o resto fica com os defaults.
REVOKE INSERT ON public.couple_spaces FROM authenticated, anon;
GRANT INSERT (invite_code, house_name, partner1_name, partner2_name,
              relationship_start_date, initials, timezone)
  ON public.couple_spaces TO authenticated;

-- 5. award_lovepoints: com auth.uid() nulo (anon) a função saltava a verificação
--    de pertença. A app chama-a sempre com sessão; service_role mantém acesso.
REVOKE EXECUTE ON FUNCTION public.award_lovepoints(uuid, integer, text, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.award_lovepoints(uuid, integer, text, text, uuid) TO authenticated, service_role;

-- 6. Storage pwa-tutorials: qualquer pessoa, mesmo sem conta, podia carregar,
--    substituir ou apagar ficheiros. Só o Admin.tsx escreve; leitura continua pública.
DROP POLICY IF EXISTS "Allow upload to pwa tutorials" ON storage.objects;
DROP POLICY IF EXISTS "Allow update pwa tutorials" ON storage.objects;
DROP POLICY IF EXISTS "Allow delete pwa tutorials" ON storage.objects;
CREATE POLICY "Allow upload to pwa tutorials" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'pwa-tutorials' AND public.is_admin());
CREATE POLICY "Allow update pwa tutorials" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'pwa-tutorials' AND public.is_admin());
CREATE POLICY "Allow delete pwa tutorials" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'pwa-tutorials' AND public.is_admin());
