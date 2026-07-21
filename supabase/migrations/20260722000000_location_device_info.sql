-- Device info columns in member_locations
ALTER TABLE member_locations ADD COLUMN IF NOT EXISTS battery_level INTEGER;
ALTER TABLE member_locations ADD COLUMN IF NOT EXISTS is_charging   BOOLEAN;
ALTER TABLE member_locations ADD COLUMN IF NOT EXISTS network_type  TEXT;
ALTER TABLE member_locations ADD COLUMN IF NOT EXISTS speed_kmh     REAL;

-- Route history: every GPS point logged to reconstruct today's path
CREATE TABLE IF NOT EXISTS location_history (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_space_id  UUID NOT NULL REFERENCES couple_spaces(id) ON DELETE CASCADE,
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lat              DOUBLE PRECISION NOT NULL,
  lng              DOUBLE PRECISION NOT NULL,
  speed_kmh        REAL,
  recorded_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE location_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "couple_members_read_location_history" ON location_history
  FOR SELECT USING (
    couple_space_id IN (SELECT couple_space_id FROM members WHERE user_id = auth.uid())
  );

CREATE POLICY "member_own_location_history" ON location_history
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS location_history_couple_user_time
  ON location_history(couple_space_id, user_id, recorded_at DESC);

ALTER PUBLICATION supabase_realtime ADD TABLE location_history;
