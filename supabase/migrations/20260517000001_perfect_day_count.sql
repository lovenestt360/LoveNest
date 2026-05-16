-- Perfect Day tracking
-- Adds perfect_days_count and last_perfect_day_date to couple_spaces,
-- plus an idempotent RPC that increments the counter at most once per day.

ALTER TABLE couple_spaces
  ADD COLUMN IF NOT EXISTS perfect_days_count   integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_perfect_day_date date;

-- record_perfect_day: safe to call multiple times — only increments once per UTC day.
CREATE OR REPLACE FUNCTION record_perfect_day(p_couple_space_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE couple_spaces
  SET
    perfect_days_count   = perfect_days_count + 1,
    last_perfect_day_date = CURRENT_DATE
  WHERE
    id = p_couple_space_id
    AND (last_perfect_day_date IS NULL OR last_perfect_day_date < CURRENT_DATE);
END;
$$;

GRANT EXECUTE ON FUNCTION record_perfect_day(uuid) TO authenticated;
