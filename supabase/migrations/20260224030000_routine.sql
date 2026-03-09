-- ============================================================
-- Módulo Rotina (Hábitos Diários)
-- ============================================================

-- 1) routine_items: templates de hábitos do utilizador
CREATE TABLE IF NOT EXISTS public.routine_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_space_id uuid REFERENCES public.couple_spaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  emoji text,
  active boolean NOT NULL DEFAULT true,
  position int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_routine_items_user ON public.routine_items (user_id);
CREATE INDEX IF NOT EXISTS idx_routine_items_couple_user ON public.routine_items (couple_space_id, user_id);

ALTER TABLE public.routine_items ENABLE ROW LEVEL SECURITY;

-- Owner CRUD
CREATE POLICY "Owner can view own routine items"
  ON public.routine_items FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Owner can insert own routine items"
  ON public.routine_items FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Owner can update own routine items"
  ON public.routine_items FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Owner can delete own routine items"
  ON public.routine_items FOR DELETE USING (user_id = auth.uid());

-- Partner can view (same couple_space)
CREATE POLICY "Partner can view routine items"
  ON public.routine_items FOR SELECT
  USING (couple_space_id IS NOT NULL AND public.is_member_of_couple_space(couple_space_id));

-- updated_at trigger
CREATE TRIGGER update_routine_items_updated_at
  BEFORE UPDATE ON public.routine_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) routine_day_logs: registo diário
CREATE TABLE IF NOT EXISTS public.routine_day_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_space_id uuid REFERENCES public.couple_spaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day date NOT NULL,
  checked_item_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'unlogged',
  completion_rate numeric NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, day)
);

CREATE INDEX IF NOT EXISTS idx_routine_day_logs_user_day ON public.routine_day_logs (user_id, day DESC);
CREATE INDEX IF NOT EXISTS idx_routine_day_logs_couple ON public.routine_day_logs (couple_space_id, user_id, day DESC);

ALTER TABLE public.routine_day_logs ENABLE ROW LEVEL SECURITY;

-- Owner CRUD
CREATE POLICY "Owner can view own routine logs"
  ON public.routine_day_logs FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Owner can insert own routine logs"
  ON public.routine_day_logs FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Owner can update own routine logs"
  ON public.routine_day_logs FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Owner can delete own routine logs"
  ON public.routine_day_logs FOR DELETE USING (user_id = auth.uid());

-- Partner can view (same couple_space) – no notes
CREATE POLICY "Partner can view routine logs"
  ON public.routine_day_logs FOR SELECT
  USING (couple_space_id IS NOT NULL AND public.is_member_of_couple_space(couple_space_id));

-- updated_at trigger
CREATE TRIGGER update_routine_day_logs_updated_at
  BEFORE UPDATE ON public.routine_day_logs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.routine_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.routine_day_logs;
