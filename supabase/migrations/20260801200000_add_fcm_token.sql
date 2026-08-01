-- Adiciona suporte a Firebase Cloud Messaging (FCM) na tabela push_subscriptions.
-- Linhas FCM não têm endpoint/p256dh/auth (campos do Web Push VAPID antigo),
-- por isso tornamos essas colunas anuláveis e adicionamos fcm_token.

ALTER TABLE public.push_subscriptions
  ADD COLUMN IF NOT EXISTS fcm_token TEXT;

ALTER TABLE public.push_subscriptions
  ALTER COLUMN endpoint   DROP NOT NULL;

ALTER TABLE public.push_subscriptions
  ALTER COLUMN p256dh     DROP NOT NULL;

ALTER TABLE public.push_subscriptions
  ALTER COLUMN auth       DROP NOT NULL;

-- Um token FCM identifica um dispositivo — deve ser único
CREATE UNIQUE INDEX IF NOT EXISTS push_subscriptions_fcm_token_idx
  ON public.push_subscriptions (fcm_token)
  WHERE fcm_token IS NOT NULL;
