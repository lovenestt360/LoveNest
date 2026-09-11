-- ══════════════════════════════════════════════════════════════════════════
-- 2026-09-11 (parte 5) — fecha policies com roles={public} descobertas por
-- uma varredura manual em pg_policies. Nenhuma delas é necessária para a
-- app funcionar: os fluxos legítimos passam todos por funções SECURITY
-- DEFINER, que ignoram RLS por definição — estas policies só serviam de
-- porta aberta extra para qualquer visitante, mesmo sem sessão.
-- ══════════════════════════════════════════════════════════════════════════


-- ────────────────────────────────────────────────────────────────────────
-- admin_users — resto do esquema antigo (o cliente precisava de ler o id
-- de um admin directamente para o header x-admin-id). Já não é preciso:
-- is_admin() verifica auth.uid() no servidor, e a policy "Admin can view
-- own row" (migration de hoje mais cedo) já cobre o caso legítimo. O
-- DROP anterior falhou porque o nome real em produção ("Public select
-- admin_users for auth") diverge do nome no ficheiro de migration
-- original ("Public can view admin usernames") — provavelmente editado
-- manualmente no dashboard em algum momento.
-- ────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Public select admin_users for auth" ON public.admin_users;

-- CRÍTICO: "Admin setup" era uma policy de INSERT aberta a "public" — o
-- mesmo problema de nome divergente (o ficheiro original chamava-lhe
-- "Allow registration of admin users"). Isto deixava QUALQUER visitante,
-- sem sessão nenhuma, inserir-se directamente em admin_users e tornar-se
-- admin — ignorando por completo a validação da Edge Function
-- admin-claim (que confirma ADMIN_SETUP_KEY no servidor). A ligação
-- inicial de uma conta a admin_users já só deve acontecer através dessa
-- Edge Function (service role, ignora RLS) ou de outro admin já
-- autenticado (coberto por "Admins full access admin_users").
DROP POLICY IF EXISTS "Admin setup" ON public.admin_users;


-- ────────────────────────────────────────────────────────────────────────
-- couple_daily_missions / mission_completions — só escritas por
-- fn_get_or_create_daily_missions_v5() e checkMissionCompletion(), ambas
-- SECURITY DEFINER (ignoram RLS). Nenhum código do cliente lhes acede
-- directamente (confirmado por grep em src/). A policy FOR ALL
-- USING(true) WITH CHECK(true) deixava qualquer visitante ler, escrever
-- ou apagar dados de missões de QUALQUER casal.
-- ────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Admins/Service can manage daily missions" ON public.couple_daily_missions;
DROP POLICY IF EXISTS "allow all mission completions" ON public.mission_completions;


-- ────────────────────────────────────────────────────────────────────────
-- edge_function_logs — guarda payloads de webhooks (paysuite-webhook,
-- send-push), potencialmente com dados de pagamento. As Edge Functions
-- escrevem com a service role key, que ignora RLS — não precisam de
-- nenhuma policy de INSERT. A policy de SELECT ("Admins can view logs")
-- estava aberta a public apesar do nome; agora exige is_admin() a sério.
-- ────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Admins can view logs" ON public.edge_function_logs;
CREATE POLICY "Admins can view logs"
  ON public.edge_function_logs FOR SELECT
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Enable insert for service role" ON public.edge_function_logs;

NOTIFY pgrst, 'reload schema';

SELECT 'policies públicas fechadas 2026-09-11 ✓' AS resultado;
