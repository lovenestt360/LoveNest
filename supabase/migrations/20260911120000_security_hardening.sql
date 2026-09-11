-- ══════════════════════════════════════════════════════════════════════════
-- SECURITY HARDENING — 2026-09-11
-- Corrige os achados Críticos/Altos da revisão técnica de 2026-09-09
-- (docs/REVISAO_TECNICA_2026-09-09.md), itens #1, #2, #3, #7.
--
-- IMPORTANTE: esta migration muda o mecanismo de login de admin. Depois de
-- aplicada, a conta de admin existente perde acesso até ser reclamada de
-- novo em /admin-register (agora exige uma conta real do Supabase Auth).
-- Ver instruções no final deste ficheiro.
-- ══════════════════════════════════════════════════════════════════════════


-- ────────────────────────────────────────────────────────────────────────
-- 1. ADMIN AUTH — deixa de confiar num header x-admin-id controlado pelo
--    cliente. admin_users passa a ligar-se a uma conta real do Supabase
--    Auth (auth.users), e is_admin() passa a verificar auth.uid().
--
--    Problema anterior: SELECT e INSERT públicos em admin_users
--    (USING(true) / WITH CHECK(true)) permitiam a qualquer visitante ler o
--    id (e password_hash) de um admin existente, ou inserir um admin novo,
--    e depois enviar esse id no header x-admin-id — bypass total, sem
--    precisar de password nenhuma.
-- ────────────────────────────────────────────────────────────────────────

ALTER TABLE public.admin_users
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Linhas antigas (sistema de username/password_hash) não têm user_id e
-- nunca mais poderão ser usadas para autenticar — o novo is_admin() exige
-- user_id = auth.uid(). Removidas para /admin-register voltar a permitir
-- reclamar o primeiro admin.
DELETE FROM public.admin_users WHERE user_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS admin_users_user_id_key ON public.admin_users(user_id);

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP POLICY IF EXISTS "Public can view admin usernames"      ON public.admin_users;
DROP POLICY IF EXISTS "Allow registration of admin users"    ON public.admin_users;
DROP POLICY IF EXISTS "Admin can view own row"                ON public.admin_users;
DROP POLICY IF EXISTS "Admins full access admin_users"        ON public.admin_users;

-- Um admin só vê a própria linha — nunca username/id de outro admin
CREATE POLICY "Admin can view own row"
    ON public.admin_users FOR SELECT
    USING (user_id = auth.uid());

-- Ninguém insere/edita via cliente. A ligação inicial acontece só através
-- da Edge Function admin-claim (service role + segredo ADMIN_SETUP_KEY).
CREATE POLICY "Admins full access admin_users"
    ON public.admin_users FOR ALL
    USING (public.is_admin())
    WITH CHECK (public.is_admin());


-- ────────────────────────────────────────────────────────────────────────
-- 2. COUPLE_SPACES — campos de faturação deixam de ser editáveis por
--    qualquer membro. A policy de UPDATE "Members can update their couple
--    space" (migration 20260309005516) não tinha WITH CHECK nem restrição
--    de coluna, por isso um membro com permissão de UPDATE na própria
--    linha conseguia, em teoria, escrever subscription_status/tier_level
--    diretamente a partir do browser.
--
--    Fix: GRANT de coluna — authenticated só pode dar UPDATE nos campos
--    cosméticos/de perfil. Os campos de faturação e trial passam a ser
--    escritos só através de funções SECURITY DEFINER auditadas abaixo.
-- ────────────────────────────────────────────────────────────────────────

REVOKE UPDATE ON public.couple_spaces FROM authenticated;
GRANT UPDATE (
  house_name, partner1_name, partner2_name, initials,
  relationship_start_date, chat_wallpaper_url, chat_wallpaper_opacity,
  age_gap_flag
) ON public.couple_spaces TO authenticated;

-- activate_trial() — substitui o UPDATE direto que ProtectedRoute.tsx
-- fazia em trial_started_at/trial_ends_at/trial_used. Verifica pertença
-- ao espaço e impede reativar um trial já usado (o UPDATE direto anterior
-- não tinha nenhuma das duas verificações).
CREATE OR REPLACE FUNCTION public.activate_trial(p_couple_space_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_member_of_couple_space(p_couple_space_id) THEN
    RAISE EXCEPTION 'not a member of this couple space';
  END IF;

  UPDATE public.couple_spaces
  SET trial_started_at = now(),
      trial_ends_at     = now() + INTERVAL '15 days',
      trial_used        = true
  WHERE id = p_couple_space_id
    AND trial_used IS DISTINCT FROM true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'trial already used or space not found';
  END IF;
END;
$$;
GRANT EXECUTE ON FUNCTION public.activate_trial(UUID) TO authenticated;

-- admin_set_suspended / admin_set_verified / admin_assign_plan /
-- admin_remove_plan — as quatro escritas de faturação que Admin.tsx fazia
-- via UPDATE direto (com adminClient a usar o header x-admin-id). Agora
-- passam por RPC, cada uma a validar is_admin() no servidor.

CREATE OR REPLACE FUNCTION public.admin_set_suspended(p_couple_space_id UUID, p_suspended BOOLEAN)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  UPDATE public.couple_spaces SET is_suspended = p_suspended WHERE id = p_couple_space_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_set_suspended(UUID, BOOLEAN) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_set_verified(p_couple_space_id UUID, p_verified BOOLEAN)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  UPDATE public.couple_spaces SET is_verified = p_verified WHERE id = p_couple_space_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_set_verified(UUID, BOOLEAN) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_assign_plan(
  p_couple_space_id UUID,
  p_plan_id         UUID,
  p_tier_level      INT,
  p_trial_days      INT DEFAULT 0
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now TIMESTAMPTZ := now();
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  UPDATE public.couple_spaces
  SET subscription_status = 'active',
      plan_id             = p_plan_id,
      tier_level           = p_tier_level,
      trial_started_at = CASE WHEN p_trial_days > 0 THEN v_now ELSE trial_started_at END,
      trial_ends_at     = CASE WHEN p_trial_days > 0 THEN v_now + make_interval(days => p_trial_days) ELSE trial_ends_at END,
      trial_used        = CASE WHEN p_trial_days > 0 THEN true ELSE trial_used END
  WHERE id = p_couple_space_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_assign_plan(UUID, UUID, INT, INT) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_remove_plan(p_couple_space_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  UPDATE public.couple_spaces
  SET subscription_status = 'inactive', plan_id = NULL, tier_level = 0
  WHERE id = p_couple_space_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_remove_plan(UUID) TO authenticated;


-- ────────────────────────────────────────────────────────────────────────
-- 3. AWARD_LOVEPOINTS — validação de pertença e limite de montante.
--    Antes: SECURITY DEFINER, GRANT EXECUTE TO authenticated, sem
--    verificar se o chamador pertence a p_couple_space_id nem limitar
--    p_amount — qualquer conta autenticada podia creditar pontos
--    arbitrários a qualquer espaço via supabase.rpc() direto.
--
--    A verificação de auth.uid() IS NOT NULL deixa passar chamadas
--    internas feitas por update_streak/checkMissionCompletion quando
--    corridas em contexto de service role (auth.uid() é NULL aí) — o
--    objetivo é fechar só a porta de entrada direta do cliente.
-- ────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.award_lovepoints(
  p_couple_space_id UUID,
  p_amount          INT,
  p_source          TEXT,
  p_description     TEXT DEFAULT NULL,
  p_user_id         UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.is_member_of_couple_space(p_couple_space_id) THEN
    RAISE EXCEPTION 'not a member of this couple space';
  END IF;

  IF p_amount IS NULL OR p_amount = 0 OR abs(p_amount) > 500 THEN
    RAISE EXCEPTION 'invalid lovepoints amount';
  END IF;

  IF auth.uid() IS NOT NULL AND p_user_id IS NOT NULL AND p_user_id <> auth.uid() THEN
    RAISE EXCEPTION 'cannot award points on behalf of another user';
  END IF;

  INSERT INTO public.lovepoints_ledger (couple_space_id, user_id, amount, source, description)
  VALUES (p_couple_space_id, p_user_id, p_amount, p_source, p_description);

  INSERT INTO public.points (couple_space_id, total_points)
  VALUES (p_couple_space_id, p_amount)
  ON CONFLICT (couple_space_id)
  DO UPDATE SET total_points = public.points.total_points + p_amount, updated_at = now();
END;
$$;

GRANT EXECUTE ON FUNCTION public.award_lovepoints(UUID, INT, TEXT, TEXT, UUID) TO authenticated;


-- ────────────────────────────────────────────────────────────────────────
-- 7. STORAGE — avatars (UPDATE/DELETE restritos à própria pasta) e photos
--    (DELETE removido — nenhum caminho do cliente apaga deste bucket).
--
--    avatars: caminho é sempre "{user.id}/..." (Settings.tsx,
--    useUserSettings.ts). As policies antigas de UPDATE/DELETE só
--    verificavam bucket_id = 'avatars', sem checar a pasta — qualquer
--    utilizador autenticado podia substituir ou apagar o avatar de outra
--    pessoa.
--
--    photos: usado só pelo TimeCapsule (caminho fixo "capsules/...", não
--    por pasta de utilizador/espaço) e nenhum ecrã do cliente chama
--    .remove() neste bucket — a policy de DELETE pública era pura
--    superfície de ataque sem uso legítimo.
-- ────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Authenticated users can update avatars" ON storage.objects;
CREATE POLICY "Users can update own avatar folder"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Authenticated users can delete avatars" ON storage.objects;
CREATE POLICY "Users can delete own avatar folder"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "photos_auth_delete" ON storage.objects;

NOTIFY pgrst, 'reload schema';

SELECT 'security hardening 2026-09-11 aplicado ✓' AS resultado;

-- ══════════════════════════════════════════════════════════════════════════
-- PASSO MANUAL OBRIGATÓRIO APÓS APLICAR ESTA MIGRATION:
--
-- 1. Ir a /admin-register no site e reclamar o admin de novo, com email +
--    password reais (a mesma VITE_ADMIN_SETUP_KEY que já está configurada
--    continua a valer no formulário, mas quem valida agora é a Edge
--    Function admin-claim contra o segredo ADMIN_SETUP_KEY do servidor).
-- 2. Configurar o segredo ADMIN_SETUP_KEY na Edge Function (mesmo valor
--    de VITE_ADMIN_SETUP_KEY, ou um novo):
--      supabase secrets set ADMIN_SETUP_KEY=<valor>
-- 3. Fazer deploy das Edge Functions alteradas:
--      supabase functions deploy send-push
--      supabase functions deploy geofence-check
--      supabase functions deploy generate-love-wrapped
--      supabase functions deploy paysuite-webhook
--      supabase functions deploy admin-claim
-- ══════════════════════════════════════════════════════════════════════════
