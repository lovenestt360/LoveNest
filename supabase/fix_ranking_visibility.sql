-- 2026.03.17 - Fix Global Ranking Visibility
-- Allows authenticated users to see house names for the ranking table.

-- 1. Ensure public can view house names for ranking
-- This is necessary because the Ranking page needs to map couple_space_id to a human-readable name.
DROP POLICY IF EXISTS "Public can view house names for ranking" ON public.couple_spaces;
CREATE POLICY "Public can view house names for ranking"
  ON public.couple_spaces FOR SELECT
  TO authenticated
  USING (true);

-- 2. Ensure love_streaks are also publicly viewable (already exists in some migrations, but making sure)
DROP POLICY IF EXISTS "Public can view streaks for ranking" ON public.love_streaks;
CREATE POLICY "Public can view streaks for ranking"
  ON public.love_streaks FOR SELECT
  TO authenticated
  USING (true);

-- Note: We are allowing 'authenticated' users to see these tables for ranking purposes.
-- This allows the Ranking component to fetch all streaks and then fetch the corresponding house names.
