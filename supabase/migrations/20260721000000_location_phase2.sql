-- ── Etapa 11: Locais Favoritos ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS favorite_places (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_space_id  UUID NOT NULL REFERENCES couple_spaces(id) ON DELETE CASCADE,
  created_by       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  icon             TEXT NOT NULL DEFAULT 'MapPin', -- Lucide icon name
  lat              DOUBLE PRECISION NOT NULL,
  lng              DOUBLE PRECISION NOT NULL,
  radius_m         INTEGER NOT NULL DEFAULT 100,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE favorite_places ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "couple_members_read_places" ON favorite_places;
CREATE POLICY "couple_members_read_places" ON favorite_places
  FOR SELECT USING (
    couple_space_id IN (
      SELECT couple_space_id FROM members WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "couple_members_manage_places" ON favorite_places;
CREATE POLICY "couple_members_manage_places" ON favorite_places
  FOR ALL USING (
    couple_space_id IN (
      SELECT couple_space_id FROM members WHERE user_id = auth.uid()
    )
  ) WITH CHECK (
    couple_space_id IN (
      SELECT couple_space_id FROM members WHERE user_id = auth.uid()
    )
  );

-- ── Etapa 13: Momentos de Encontro ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS meeting_moments (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_space_id  UUID NOT NULL REFERENCES couple_spaces(id) ON DELETE CASCADE,
  met_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  place_name       TEXT -- endereço ou nome de local favorito (pode ser NULL)
);

ALTER TABLE meeting_moments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "couple_members_read_meetings" ON meeting_moments;
CREATE POLICY "couple_members_read_meetings" ON meeting_moments
  FOR SELECT USING (
    couple_space_id IN (
      SELECT couple_space_id FROM members WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "couple_members_insert_meetings" ON meeting_moments;
CREATE POLICY "couple_members_insert_meetings" ON meeting_moments
  FOR INSERT WITH CHECK (
    couple_space_id IN (
      SELECT couple_space_id FROM members WHERE user_id = auth.uid()
    )
  );
