ALTER TABLE public.mood_checkins ADD COLUMN IF NOT EXISTS emotions text[] DEFAULT '{}';
ALTER TABLE public.mood_checkins ADD COLUMN IF NOT EXISTS activities text[] DEFAULT '{}';
ALTER TABLE public.mood_checkins ADD COLUMN IF NOT EXISTS sleep_quality text;