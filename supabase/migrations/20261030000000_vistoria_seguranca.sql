-- Vistoria de segurança (2026-10-30). Fecha o que foi encontrado em produção
-- e não depende de mudanças na app. Idempotente: pode correr mais de uma vez.
-- Aplicar à mão no SQL Editor do Supabase.

-- ── 1. Comprovativos de pagamento privados ─────────────────────────────────
-- O bucket estava público e "Public can view receipts" deixava qualquer
-- pessoa, sem conta, listar e descarregar os comprovativos. A app já os abre
-- por links assinados (src/lib/receiptStorage.ts), por isso nada parte.
UPDATE storage.buckets SET public = false WHERE id = 'receipts';

DROP POLICY IF EXISTS "Public can view receipts" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload receipts" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload receipts" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own receipts" ON storage.objects;
DROP POLICY IF EXISTS "Admins can manage receipts" ON storage.objects;
DROP POLICY IF EXISTS "Receipt owners can view" ON storage.objects;
DROP POLICY IF EXISTS "Receipt owners can upload" ON storage.objects;
DROP POLICY IF EXISTS "Receipt owners can update" ON storage.objects;
DROP POLICY IF EXISTS "Receipt owners can delete" ON storage.objects;
DROP POLICY IF EXISTS "Admins can manage private receipts" ON storage.objects;

CREATE POLICY "Receipt owners can view" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'receipts' AND (owner = auth.uid() OR public.is_admin()));
CREATE POLICY "Receipt owners can upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'receipts');
CREATE POLICY "Receipt owners can update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'receipts' AND owner = auth.uid())
  WITH CHECK (bucket_id = 'receipts' AND owner = auth.uid());
CREATE POLICY "Receipt owners can delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'receipts' AND owner = auth.uid());
CREATE POLICY "Admins can manage private receipts" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'receipts' AND public.is_admin())
  WITH CHECK (bucket_id = 'receipts' AND public.is_admin());

-- ── 2. Livros pagos só para quem comprou ───────────────────────────────────
-- "Authenticated can read book files via signed url" deixava qualquer conta
-- descarregar qualquer livro. Passa a exigir livro gratuito publicado ou uma
-- compra aprovada na casa de quem pede.
DROP POLICY IF EXISTS "Authenticated can read book files via signed url" ON storage.objects;
DROP POLICY IF EXISTS "Entitled users can read book files" ON storage.objects;
CREATE POLICY "Entitled users can read book files" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'book-files'
    AND (
      public.is_admin()
      OR EXISTS (
        SELECT 1 FROM public.books b
        WHERE b.file_path = storage.objects.name
          AND b.status = 'published'
          AND (
            b.is_free = true
            OR EXISTS (
              SELECT 1 FROM public.book_purchases bp
              WHERE bp.book_id = b.id
                AND bp.status = 'approved'
                AND public.is_member_of_couple_space(bp.couple_space_id)
            )
          )
      )
    )
  );

-- ── 3. Missões diárias com RLS ─────────────────────────────────────────────
-- Era a única tabela sem RLS: qualquer pessoa, sem conta, lia (e podia
-- escrever) as 302 linhas, com o id de cada casa. A política de leitura dos
-- membros já existe; a escrita é feita por funções SECURITY DEFINER.
ALTER TABLE public.couple_daily_missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mission_completions ENABLE ROW LEVEL SECURITY;

-- ── 4. Funções de dados só para quem tem sessão ────────────────────────────
-- Várias funções SECURITY DEFINER recebem o id da casa e não verificam quem
-- chama (buy_guardian_item gasta os pontos, record_perfect_day/update_streak
-- mexem na sequência, set_guardian_appearance muda o Guardião…). A app só as
-- chama com sessão. Fica fora: as funções usadas dentro das políticas RLS
-- (is_admin, is_member_of_couple_space…), que o anon precisa de avaliar.
-- A verificação de pertença dentro de cada função vem numa migração seguinte.
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS fn
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef
      AND p.prorettype <> 'trigger'::regtype
      AND p.proname NOT IN ('is_admin', 'is_member_of_couple_space', 'is_member_of_space',
                            'are_users_in_same_couple_space', 'get_my_couple_space_id',
                            'current_couple_space_id', 'get_user_couple_space_id', 'rls_auto_enable')
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon', r.fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, service_role', r.fn);
  END LOOP;
END $$;

-- ── 5. "Privado" do ciclo também na base de dados ──────────────────────────
-- O par conseguia ler o perfil do ciclo e as datas da menstruação mesmo com
-- "Privado" escolhido (só a app escondia). Sintomas e intimidade já
-- respeitavam a escolha. A vista do par trata "sem perfil" como privado.
DROP POLICY IF EXISTS "Partner can view cycle_profiles" ON public.cycle_profiles;
DROP POLICY IF EXISTS "Partner summary access" ON public.cycle_profiles;
DROP POLICY IF EXISTS "Partner can view shared cycle_profiles" ON public.cycle_profiles;
CREATE POLICY "Partner can view shared cycle_profiles" ON public.cycle_profiles
  FOR SELECT TO authenticated
  USING (share_level <> 'private' AND public.are_users_in_same_couple_space(user_id));

DROP POLICY IF EXISTS "Partner can view period_entries" ON public.period_entries;
DROP POLICY IF EXISTS "Partner can view shared period_entries" ON public.period_entries;
CREATE POLICY "Partner can view shared period_entries" ON public.period_entries
  FOR SELECT TO authenticated
  USING (
    public.are_users_in_same_couple_space(user_id)
    AND EXISTS (
      SELECT 1 FROM public.cycle_profiles cp
      WHERE cp.user_id = period_entries.user_id AND cp.share_level <> 'private'
    )
  );
