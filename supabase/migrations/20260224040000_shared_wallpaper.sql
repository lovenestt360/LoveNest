-- Add shared wallpaper columns to couple_spaces
-- Both partners see the same wallpaper via existing RLS (members can read)
ALTER TABLE public.couple_spaces
  ADD COLUMN IF NOT EXISTS chat_wallpaper_url text,
  ADD COLUMN IF NOT EXISTS chat_wallpaper_opacity numeric NOT NULL DEFAULT 0.30;
