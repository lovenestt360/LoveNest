# LoveNest

Espaço privado para casais (e modo individual): chat, memórias, humor, ciclo, rotinas, oração e jejum, biblioteca, jornada com LovePoints, localização partilhada e subscrições.

Produção: https://www.lovenestt.com

## Stack

- React 18 + TypeScript + Vite, Tailwind, shadcn/ui, Framer Motion
- Supabase: Auth, Postgres com RLS, Storage, Realtime, Edge Functions (Deno), pg_cron
- Firebase Cloud Messaging para notificações push
- PaySuite para pagamentos (M-Pesa, e-Mola, cartão) + pagamento manual com comprovativo
- Sentry para erros, Vercel para o frontend

## Desenvolvimento

```sh
npm install
npm run dev        # servidor local
npm run build      # build de produção
npx tsc --noEmit -p tsconfig.app.json   # verificação de tipos (o build não corre isto)
```

Variáveis de ambiente (`.env`, nunca versionado): `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`, `VITE_VAPID_PUBLIC_KEY`, `VITE_MAPBOX_ACCESS_TOKEN`, `VITE_SENTRY_DSN`. Qualquer variável `VITE_*` acaba no bundle público — nunca pôr segredos nelas.

Tipos do Supabase (regenerar depois de mudar o schema):

```sh
supabase gen types typescript --project-id zyzeiwyfsnbnpzdqtxik > src/integrations/supabase/types.ts
```

## Base de dados e migrações

O histórico de migrações da CLI está dessincronizado com a produção — **não usar `supabase db push`**. Cada migração nova em `supabase/migrations/` é aplicada à mão no SQL Editor (ou `supabase db query --linked -f <ficheiro>`), e deve ser idempotente (`IF NOT EXISTS`, `CREATE OR REPLACE`, `DROP POLICY IF EXISTS`).

Nomes de policies em produção nem sempre coincidem com os ficheiros antigos. Antes de mexer em RLS, confirmar o estado real:

```sql
SELECT tablename, policyname, cmd, roles, qual, with_check FROM pg_policies WHERE schemaname = 'public';
```

## Edge Functions

`supabase functions deploy <nome>`. Segredos necessários (`supabase secrets set`): `FCM_CLIENT_EMAIL`, `FCM_PRIVATE_KEY`, `FCM_VAPID_KEY`, `PAYSUITE_API_KEY`, `PAYSUITE_WEBHOOK_SECRET`, `ADMIN_SETUP_KEY`, `LOVE_WRAPPED_CRON_SECRET`.

## Admin

Login em `/admin-login` com uma conta real do Supabase Auth que tenha linha em `admin_users`. O primeiro admin é criado em `/admin-setup-secret` (validado no servidor pela função `admin-claim` contra `ADMIN_SETUP_KEY`). Todas as escritas de faturação passam por RPCs `SECURITY DEFINER` que verificam `is_admin()`.
