
-- Table: daily_prayers (one prayer per day per couple space)
CREATE TABLE public.daily_prayers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  couple_space_id uuid NOT NULL REFERENCES public.couple_spaces(id),
  day_key date NOT NULL DEFAULT CURRENT_DATE,
  prayer_text text NOT NULL,
  verse_ref text,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (couple_space_id, day_key)
);

ALTER TABLE public.daily_prayers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view prayers" ON public.daily_prayers FOR SELECT USING (is_member_of_couple_space(couple_space_id));
CREATE POLICY "Members can create prayers" ON public.daily_prayers FOR INSERT WITH CHECK (is_member_of_couple_space(couple_space_id) AND created_by = auth.uid());
CREATE POLICY "Members can update prayers" ON public.daily_prayers FOR UPDATE USING (is_member_of_couple_space(couple_space_id));
CREATE POLICY "Members can delete prayers" ON public.daily_prayers FOR DELETE USING (is_member_of_couple_space(couple_space_id));

CREATE INDEX idx_daily_prayers_lookup ON public.daily_prayers (couple_space_id, day_key DESC);

-- Table: daily_spiritual_logs (one log per user per day per couple space)
CREATE TABLE public.daily_spiritual_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  couple_space_id uuid NOT NULL REFERENCES public.couple_spaces(id),
  user_id uuid NOT NULL,
  day_key date NOT NULL DEFAULT CURRENT_DATE,
  prayed_today boolean NOT NULL DEFAULT false,
  cried_today boolean NOT NULL DEFAULT false,
  gratitude_note text,
  reflection_note text,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (couple_space_id, user_id, day_key)
);

ALTER TABLE public.daily_spiritual_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view logs" ON public.daily_spiritual_logs FOR SELECT USING (is_member_of_couple_space(couple_space_id));
CREATE POLICY "Users can insert own log" ON public.daily_spiritual_logs FOR INSERT WITH CHECK (is_member_of_couple_space(couple_space_id) AND user_id = auth.uid());
CREATE POLICY "Users can update own log" ON public.daily_spiritual_logs FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own log" ON public.daily_spiritual_logs FOR DELETE USING (user_id = auth.uid());

CREATE INDEX idx_daily_spiritual_logs_lookup ON public.daily_spiritual_logs (couple_space_id, day_key DESC);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.daily_prayers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.daily_spiritual_logs;
