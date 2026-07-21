-- Tabela de localizações em tempo real dos membros
CREATE TABLE IF NOT EXISTS member_locations (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  couple_space_id  UUID NOT NULL REFERENCES couple_spaces(id) ON DELETE CASCADE,
  lat              DOUBLE PRECISION NOT NULL,
  lng              DOUBLE PRECISION NOT NULL,
  accuracy         REAL,
  address          TEXT,
  sharing_enabled  BOOLEAN NOT NULL DEFAULT false,
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, couple_space_id)
);

ALTER TABLE member_locations ENABLE ROW LEVEL SECURITY;

-- Recriar policies (DROP IF EXISTS para idempotência)
DROP POLICY IF EXISTS "couple_members_read_locations" ON member_locations;
DROP POLICY IF EXISTS "member_manage_own_location" ON member_locations;

-- Qualquer membro do mesmo couple_space pode ler
CREATE POLICY "couple_members_read_locations" ON member_locations
  FOR SELECT USING (
    couple_space_id IN (
      SELECT couple_space_id FROM members
      WHERE user_id = auth.uid()
    )
  );

-- Cada utilizador gere apenas a sua própria linha
CREATE POLICY "member_manage_own_location" ON member_locations
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Activar Realtime para actualizações em tempo real
ALTER PUBLICATION supabase_realtime ADD TABLE member_locations;

-- Gate premium: tier 1 (Plus+)
INSERT INTO feature_tiers (feature_id, feature_label, min_tier)
VALUES ('location_sharing', 'Localização', 1)
ON CONFLICT (feature_id) DO UPDATE SET feature_label = EXCLUDED.feature_label, min_tier = EXCLUDED.min_tier;
