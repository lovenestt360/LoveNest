
-- Schedule blocks (recurring routine)
CREATE TABLE public.schedule_blocks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  couple_space_id uuid NOT NULL REFERENCES public.couple_spaces(id),
  user_id uuid NOT NULL,
  title text NOT NULL,
  category text NOT NULL DEFAULT 'outro',
  day_of_week integer NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time time NOT NULL,
  end_time time NOT NULL,
  location text,
  notes text,
  is_recurring boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_schedule_blocks_lookup ON public.schedule_blocks (couple_space_id, user_id, day_of_week, start_time);

ALTER TABLE public.schedule_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view schedule blocks"
  ON public.schedule_blocks FOR SELECT
  USING (public.is_member_of_couple_space(couple_space_id));

CREATE POLICY "Members can create schedule blocks"
  ON public.schedule_blocks FOR INSERT
  WITH CHECK (public.is_member_of_couple_space(couple_space_id) AND user_id = auth.uid());

CREATE POLICY "Members can update schedule blocks"
  ON public.schedule_blocks FOR UPDATE
  USING (public.is_member_of_couple_space(couple_space_id));

CREATE POLICY "Members can delete schedule blocks"
  ON public.schedule_blocks FOR DELETE
  USING (public.is_member_of_couple_space(couple_space_id));

-- Events (one-off couple events)
CREATE TABLE public.events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  couple_space_id uuid NOT NULL REFERENCES public.couple_spaces(id),
  created_by uuid NOT NULL,
  title text NOT NULL,
  event_date date NOT NULL,
  start_time time,
  end_time time,
  location text,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_events_lookup ON public.events (couple_space_id, event_date, start_time);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view events"
  ON public.events FOR SELECT
  USING (public.is_member_of_couple_space(couple_space_id));

CREATE POLICY "Members can create events"
  ON public.events FOR INSERT
  WITH CHECK (public.is_member_of_couple_space(couple_space_id) AND created_by = auth.uid());

CREATE POLICY "Members can update events"
  ON public.events FOR UPDATE
  USING (public.is_member_of_couple_space(couple_space_id));

CREATE POLICY "Members can delete events"
  ON public.events FOR DELETE
  USING (public.is_member_of_couple_space(couple_space_id));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.schedule_blocks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.events;
