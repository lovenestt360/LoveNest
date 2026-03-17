-- ============================================================
-- ATIVAÇÃO DE NOTIFICAÇÕES (Realtime e Push)
-- Executar no SQL Editor do Supabase
-- ============================================================

-- 1. Habilitar Realtime para as tabelas principais
-- Usamos DROP/CREATE para garantir que a lista de tabelas seja exatamente a desejada sem erros de "já existe"
DROP PUBLICATION IF EXISTS supabase_realtime;
CREATE PUBLICATION supabase_realtime FOR TABLE 
  public.messages, 
  public.mood_checkins, 
  public.tasks, 
  public.photos, 
  public.photo_comments, 
  public.events, 
  public.schedule_blocks, 
  public.daily_prayers, 
  public.daily_spiritual_logs, 
  public.complaints, 
  public.complaint_messages;

-- 2. Garantir que o Realtime envie o payload completo (Replica Identity Full)
-- Isso permite que o frontend receba o conteúdo da mensagem/tarefa mesmo sem fazer nova query
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.mood_checkins REPLICA IDENTITY FULL;
ALTER TABLE public.tasks REPLICA IDENTITY FULL;
ALTER TABLE public.photos REPLICA IDENTITY FULL;
ALTER TABLE public.photo_comments REPLICA IDENTITY FULL;
ALTER TABLE public.events REPLICA IDENTITY FULL;
ALTER TABLE public.schedule_blocks REPLICA IDENTITY FULL;
ALTER TABLE public.daily_prayers REPLICA IDENTITY FULL;
ALTER TABLE public.daily_spiritual_logs REPLICA IDENTITY FULL;
ALTER TABLE public.complaints REPLICA IDENTITY FULL;
ALTER TABLE public.complaint_messages REPLICA IDENTITY FULL;

-- 3. Criar tabela de logs para Edge Functions (se não existir)
-- Ajuda a depurar falhas no envio de Push
CREATE TABLE IF NOT EXISTS public.edge_function_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    function_name text NOT NULL,
    event_type text NOT NULL,
    payload jsonb,
    created_at timestamptz DEFAULT now()
);

ALTER TABLE public.edge_function_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can view logs" ON public.edge_function_logs;
CREATE POLICY "Admins can view logs" ON public.edge_function_logs FOR SELECT USING (true); -- Ajustar conforme necessário

-- 4. Garantir permissões de EXECUTE para a Edge Function chamar auth.getUser
GRANT USAGE ON SCHEMA public TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- ============================================================
-- NOTA IMPORTANTE PARA NOTIFICAÇÕES PUSH (EXTERNAL):
-- ============================================================
-- Precisas de configurar as chaves VAPID no teu projecto Supabase.
-- No terminal (com Supabase CLI):
-- supabase secrets set VAPID_PUBLIC_KEY=teu_pub_key VAPID_PRIVATE_KEY=teu_priv_key
--
-- Ou no Dashboard -> Settings -> API -> Edge Function Secrets
-- ============================================================
