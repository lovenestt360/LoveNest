-- Relationship Milestones V1
-- Stores each couple's milestone events. The UNIQUE constraint is the
-- DB-level guarantee that any given milestone is recorded exactly once,
-- even if the client calls insert multiple times (race condition, refresh, etc.).

CREATE TABLE IF NOT EXISTS relationship_milestones (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_space_id uuid        NOT NULL REFERENCES couple_spaces(id) ON DELETE CASCADE,
  milestone_type  text        NOT NULL,   -- 'streak' | 'perfect_day' | ... (extensible)
  milestone_value integer     NOT NULL,   -- e.g. 7, 14, 30 for streak days
  created_at      timestamptz NOT NULL DEFAULT now(),

  UNIQUE (couple_space_id, milestone_type, milestone_value)
);

ALTER TABLE relationship_milestones ENABLE ROW LEVEL SECURITY;

-- Members of the couple can read their own milestones
CREATE POLICY "couple members select milestones"
  ON relationship_milestones FOR SELECT
  USING (
    couple_space_id IN (
      SELECT couple_space_id FROM members WHERE user_id = auth.uid()
    )
  );

-- Members can insert milestones for their own couple
CREATE POLICY "couple members insert milestones"
  ON relationship_milestones FOR INSERT
  WITH CHECK (
    couple_space_id IN (
      SELECT couple_space_id FROM members WHERE user_id = auth.uid()
    )
  );
