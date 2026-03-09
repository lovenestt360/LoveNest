-- ============================================================
-- User Settings (wallpaper do chat, etc.)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.user_settings (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  chat_wallpaper_url text,
  chat_wallpaper_opacity numeric NOT NULL DEFAULT 0.12,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "User can view own settings"
  ON public.user_settings FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "User can insert own settings"
  ON public.user_settings FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "User can update own settings"
  ON public.user_settings FOR UPDATE USING (user_id = auth.uid());

-- Storage bucket for chat wallpapers
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-wallpapers', 'chat-wallpapers', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can upload wallpapers"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'chat-wallpapers' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Anyone can view wallpapers"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'chat-wallpapers');

CREATE POLICY "Users can delete own wallpapers"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'chat-wallpapers' AND (storage.foldername(name))[1] = auth.uid()::text);
