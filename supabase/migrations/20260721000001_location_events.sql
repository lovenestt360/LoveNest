-- location_events: tracks enter/exit at favorite places per user
CREATE TABLE IF NOT EXISTS location_events (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_space_id  UUID NOT NULL REFERENCES couple_spaces(id) ON DELETE CASCADE,
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type       TEXT NOT NULL CHECK (event_type IN ('enter','exit')),
  place_name       TEXT NOT NULL,
  occurred_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE location_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "couple_members_read_location_events" ON location_events
  FOR SELECT USING (
    couple_space_id IN (
      SELECT couple_space_id FROM members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "member_own_location_events" ON location_events
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

ALTER PUBLICATION supabase_realtime ADD TABLE location_events;

-- Per-user preferences controlling what MY device sends to the partner
CREATE TABLE IF NOT EXISTS location_notification_prefs (
  user_id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  notify_arrives   BOOLEAN NOT NULL DEFAULT true,
  notify_leaves    BOOLEAN NOT NULL DEFAULT false,
  notify_proximity BOOLEAN NOT NULL DEFAULT true,
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE location_notification_prefs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_own_location_notif_prefs" ON location_notification_prefs
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
