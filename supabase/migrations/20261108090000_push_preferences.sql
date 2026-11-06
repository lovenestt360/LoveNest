-- Interruptores de "Avisos em tempo real": passam a ficar na conta, para a função
-- send-push os respeitar com a app fechada e em qualquer aparelho.
-- Tabela própria porque cada linha de notification_settings traz uma hora preferida,
-- que limitaria os avisos da smart-notifications.
-- muted: categorias desligadas. Sem linha, está tudo ligado.
-- Idempotente. Aplicar à mão no SQL Editor do Supabase, antes de atualizar a função.

BEGIN;

CREATE TABLE IF NOT EXISTS public.push_preferences (
  user_id    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  muted      TEXT[] NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.push_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Own push preferences select" ON public.push_preferences;
CREATE POLICY "Own push preferences select"
  ON public.push_preferences FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Own push preferences insert" ON public.push_preferences;
CREATE POLICY "Own push preferences insert"
  ON public.push_preferences FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Own push preferences update" ON public.push_preferences;
CREATE POLICY "Own push preferences update"
  ON public.push_preferences FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

REVOKE ALL ON public.push_preferences FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE ON public.push_preferences TO authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;
