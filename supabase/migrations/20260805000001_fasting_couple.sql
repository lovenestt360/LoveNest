-- ── Fasting Couple Feature ──────────────────────────────────────
-- RLS: par pode ler o perfil de jejum do outro
DROP POLICY IF EXISTS "couple_members_read_fasting_profiles" ON fasting_profiles;
CREATE POLICY "couple_members_read_fasting_profiles" ON fasting_profiles
  FOR SELECT USING (
    couple_space_id IS NOT NULL AND
    couple_space_id IN (
      SELECT m.couple_space_id FROM members m
      WHERE m.user_id = auth.uid()
    )
  );

-- RLS: par pode ler os day logs do outro (para estatísticas)
DROP POLICY IF EXISTS "couple_members_read_fasting_day_logs" ON fasting_day_logs;
CREATE POLICY "couple_members_read_fasting_day_logs" ON fasting_day_logs
  FOR SELECT USING (
    user_id IN (
      SELECT m2.user_id
      FROM members m1
      JOIN members m2 ON m1.couple_space_id = m2.couple_space_id
      WHERE m1.user_id = auth.uid()
    )
  );

-- Tabela de mensagens de motivação do casal
CREATE TABLE IF NOT EXISTS fasting_couple_messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_space_id UUID NOT NULL REFERENCES couple_spaces(id) ON DELETE CASCADE,
  sender_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message         TEXT NOT NULL CHECK (length(trim(message)) > 0),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE fasting_couple_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "couple_members_read_fasting_messages" ON fasting_couple_messages;
CREATE POLICY "couple_members_read_fasting_messages" ON fasting_couple_messages
  FOR SELECT USING (
    couple_space_id IN (
      SELECT m.couple_space_id FROM members m
      WHERE m.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "couple_members_insert_fasting_messages" ON fasting_couple_messages;
CREATE POLICY "couple_members_insert_fasting_messages" ON fasting_couple_messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid() AND
    couple_space_id IN (
      SELECT m.couple_space_id FROM members m
      WHERE m.user_id = auth.uid()
    )
  );
