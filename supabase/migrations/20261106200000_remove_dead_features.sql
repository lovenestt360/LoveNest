-- Limpeza: funções que nenhum ecrã da app usa.
-- A app só protege estas (src/features/admin/liveFeatures.ts):
--   agenda, mood, prayer, conflicts, memories, historia, cycle, challenges,
--   time_capsules, wrapped, lovestreak, location_sharing, wallpapers
-- Tudo o resto em feature_tiers (ex.: stats, home, chat, biblioteca, fasting) é sobra.
-- Também sai o interruptor antigo "system_enabled", que a app já não lê.
-- Idempotente. Aplicar à mão no SQL Editor do Supabase.

BEGIN;

DELETE FROM public.feature_tiers
WHERE feature_id NOT IN (
  'agenda', 'mood', 'prayer', 'conflicts', 'memories', 'historia', 'cycle', 'challenges',
  'time_capsules', 'wrapped', 'lovestreak', 'location_sharing', 'wallpapers'
);

DELETE FROM public.feature_flags
WHERE key NOT IN (
  'agenda', 'mood', 'prayer', 'conflicts', 'memories', 'historia', 'cycle', 'challenges',
  'time_capsules', 'wrapped', 'lovestreak', 'location_sharing', 'wallpapers'
);

-- A lista "Inclui" dos planos (o que o casal vê ao escolher um plano) deixa de mostrar estas.
UPDATE public.subscription_plans
SET features = (
  SELECT COALESCE(array_agg(f), '{}')
  FROM unnest(features) AS f
  WHERE f NOT IN ('stats', 'Estatísticas', 'home', 'Home', 'chat', 'Chat', 'biblioteca', 'fasting')
)
WHERE features && ARRAY['stats', 'Estatísticas', 'home', 'Home', 'chat', 'Chat', 'biblioteca', 'fasting'];

COMMIT;
