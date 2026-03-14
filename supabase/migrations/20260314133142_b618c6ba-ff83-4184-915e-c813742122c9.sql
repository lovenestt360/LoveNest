
-- App settings table for global config flags
CREATE TABLE public.app_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value text NOT NULL DEFAULT 'false',
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can read settings
CREATE POLICY "Anyone can view app settings" ON public.app_settings FOR SELECT TO authenticated USING (true);
-- Only admins can modify
CREATE POLICY "Admins can manage app settings" ON public.app_settings FOR ALL TO public USING (is_admin());

-- Insert the free_mode flag
INSERT INTO public.app_settings (key, value) VALUES ('free_mode', 'false');

-- Free mode audit log
CREATE TABLE public.free_mode_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id text NOT NULL,
  action text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.free_mode_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage free mode logs" ON public.free_mode_logs FOR ALL TO public USING (is_admin());
