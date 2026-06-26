-- "Nossa História" — datas importantes da relação (não confundir com
-- `events`/Plano, que é agenda prática, nem com `relationship_milestones`,
-- que é exclusivamente sobre streak diário).

CREATE TABLE IF NOT EXISTS public.relationship_events (
  id              uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  couple_space_id uuid        NOT NULL REFERENCES public.couple_spaces(id) ON DELETE CASCADE,
  created_by      uuid        NOT NULL,
  title           text        NOT NULL,
  description     text,
  event_type      text        NOT NULL DEFAULT 'custom'
                    CHECK (event_type IN ('first_meeting','dating','engagement','marriage','trip','custom')),
  event_date      date        NOT NULL,
  image_path      text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_relationship_events_space_date
  ON public.relationship_events (couple_space_id, event_date);

ALTER TABLE public.relationship_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view relationship events" ON public.relationship_events;
CREATE POLICY "Members can view relationship events"
  ON public.relationship_events FOR SELECT
  USING (public.is_member_of_couple_space(couple_space_id));

DROP POLICY IF EXISTS "Members can create relationship events" ON public.relationship_events;
CREATE POLICY "Members can create relationship events"
  ON public.relationship_events FOR INSERT
  WITH CHECK (public.is_member_of_couple_space(couple_space_id) AND created_by = auth.uid());

DROP POLICY IF EXISTS "Members can update relationship events" ON public.relationship_events;
CREATE POLICY "Members can update relationship events"
  ON public.relationship_events FOR UPDATE
  USING (public.is_member_of_couple_space(couple_space_id));

DROP POLICY IF EXISTS "Members can delete relationship events" ON public.relationship_events;
CREATE POLICY "Members can delete relationship events"
  ON public.relationship_events FOR DELETE
  USING (public.is_member_of_couple_space(couple_space_id));

DROP TRIGGER IF EXISTS trg_relationship_events_updated_at ON public.relationship_events;
CREATE TRIGGER trg_relationship_events_updated_at
  BEFORE UPDATE ON public.relationship_events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.feature_tiers (feature_id, feature_label, min_tier) VALUES
  ('historia', 'Nossa História', 1)
ON CONFLICT (feature_id) DO NOTHING;

NOTIFY pgrst, 'reload schema';
