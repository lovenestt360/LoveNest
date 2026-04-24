-- ============================================
-- LOVENEST — STREAK SYSTEM V5 (FINAL)
-- Rule B: any activity counts (both users same day)
-- ============================================

BEGIN;

-- --------------------------------------------
-- 0) SAFETY: drop triggers/functions that may depend on couple_id
-- --------------------------------------------
DO $$
DECLARE r RECORD;
BEGIN
  -- drop triggers on daily_activity
  FOR r IN
    SELECT tgname FROM pg_trigger
    WHERE tgrelid = 'public.daily_activity'::regclass
      AND NOT tgisinternal
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.daily_activity;', r.tgname);
  END LOOP;

  -- drop common legacy functions if exist
  EXECUTE 'DROP FUNCTION IF EXISTS public.log_daily_activity(uuid, uuid);';
  EXECUTE 'DROP FUNCTION IF EXISTS public.log_daily_activity(uuid, text);';
  EXECUTE 'DROP FUNCTION IF EXISTS public.get_streak(uuid);';
  EXECUTE 'DROP FUNCTION IF EXISTS public.update_streak(uuid);';
  EXECUTE 'DROP FUNCTION IF EXISTS public.fn_process_streak(uuid);';
END $$;

-- --------------------------------------------
-- 1) daily_activity — unify to couple_space_id
-- --------------------------------------------

-- 1.1 ensure column exists
ALTER TABLE public.daily_activity
  ADD COLUMN IF NOT EXISTS couple_space_id uuid;

-- 1.2 migrate data if old column exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='daily_activity' AND column_name='couple_id'
  ) THEN
    UPDATE public.daily_activity
    SET couple_space_id = couple_id
    WHERE couple_space_id IS NULL;

    ALTER TABLE public.daily_activity
      DROP COLUMN couple_id;
  END IF;
END $$;

-- 1.3 ensure activity_date
ALTER TABLE public.daily_activity
  ADD COLUMN IF NOT EXISTS activity_date date;

-- 1.4 backfill activity_date
UPDATE public.daily_activity
SET activity_date = COALESCE(activity_date, (created_at)::date, CURRENT_DATE)
WHERE activity_date IS NULL;

-- 1.5 enforce not nulls (soft guard)
ALTER TABLE public.daily_activity
  ALTER COLUMN couple_space_id SET NOT NULL,
  ALTER COLUMN user_id SET NOT NULL,
  ALTER COLUMN activity_date SET NOT NULL;

-- 1.6 unique constraint (no duplicates per day/user/couple)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'daily_activity_unique_per_day'
  ) THEN
    ALTER TABLE public.daily_activity
      ADD CONSTRAINT daily_activity_unique_per_day
      UNIQUE (couple_space_id, user_id, activity_date);
  END IF;
END $$;

-- --------------------------------------------
-- 2) couple_spaces — ensure streak fields
-- --------------------------------------------
ALTER TABLE public.couple_spaces
  ADD COLUMN IF NOT EXISTS streak_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_streak_date date;

-- --------------------------------------------
-- 3) RLS — rebuild policies using couple_space_id
-- --------------------------------------------

-- drop existing policies on daily_activity
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT policyname FROM pg_policies
    WHERE schemaname='public' AND tablename='daily_activity'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.daily_activity;', r.policyname);
  END LOOP;
END $$;

-- enable RLS
ALTER TABLE public.daily_activity ENABLE ROW LEVEL SECURITY;

-- policy: select (members of same couple_space)
CREATE POLICY da_select_own_couple
ON public.daily_activity
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.members m
    WHERE m.couple_space_id = daily_activity.couple_space_id
      AND m.user_id = auth.uid()
  )
);

-- policy: insert (member inserting own activity)
CREATE POLICY da_insert_own
ON public.daily_activity
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.members m
    WHERE m.couple_space_id = daily_activity.couple_space_id
      AND m.user_id = auth.uid()
  )
);

-- --------------------------------------------
-- 4) FUNCTION — log_daily_activity (V5)
-- --------------------------------------------
CREATE OR REPLACE FUNCTION public.log_daily_activity(
  p_couple_space_id UUID,
  p_type TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_today DATE;
  v_member_count INT;
  v_active_today INT;
  v_streak INT;
BEGIN
  -- date (server-based for now; can upgrade to timezone later)
  SELECT CURRENT_DATE INTO v_today;

  -- insert activity (deduplicated by UNIQUE)
  INSERT INTO public.daily_activity (user_id, couple_space_id, type, activity_date)
  VALUES (v_user_id, p_couple_space_id, p_type, v_today)
  ON CONFLICT (couple_space_id, user_id, activity_date) DO NOTHING;

  -- count members
  SELECT COUNT(*) INTO v_member_count
  FROM public.members
  WHERE couple_space_id = p_couple_space_id;

  -- count distinct users active today
  SELECT COUNT(DISTINCT user_id) INTO v_active_today
  FROM public.daily_activity
  WHERE couple_space_id = p_couple_space_id
    AND activity_date = v_today;

  IF v_member_count >= 2 AND v_active_today >= 2 THEN
    UPDATE public.couple_spaces
    SET
      streak_count = CASE
        WHEN last_streak_date = v_today THEN streak_count
        WHEN last_streak_date = (v_today - INTERVAL '1 day')::date THEN streak_count + 1
        ELSE 1
      END,
      last_streak_date = v_today
    WHERE id = p_couple_space_id
    RETURNING streak_count INTO v_streak;
  ELSE
    SELECT streak_count INTO v_streak
    FROM public.couple_spaces
    WHERE id = p_couple_space_id;
  END IF;

  RETURN json_build_object(
    'success', true,
    'streak', COALESCE(v_streak, 0),
    'active_today', COALESCE(v_active_today, 0)
  );
END;
$$;

-- --------------------------------------------
-- 5) FUNCTION — get_streak
-- --------------------------------------------
CREATE OR REPLACE FUNCTION public.get_streak(
  p_couple_space_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_streak INT;
  v_last DATE;
BEGIN
  SELECT streak_count, last_streak_date
  INTO v_streak, v_last
  FROM public.couple_spaces
  WHERE id = p_couple_space_id;

  RETURN json_build_object(
    'streak', COALESCE(v_streak, 0),
    'last_date', v_last
  );
END;
$$;

-- --------------------------------------------
-- 6) CLEANUP — remove legacy tables if exist
-- --------------------------------------------
DROP TABLE IF EXISTS public.streaks CASCADE;
DROP TABLE IF EXISTS public.streak_daily_logs CASCADE;

COMMIT;

-- --------------------------------------------
-- 7) VERIFICATION
-- --------------------------------------------
-- Expect:
-- 1) no couple_id column
-- 2) couple_space_id exists
-- 3) streak columns exist
-- 4) unique constraint exists
-- 5) no streaks table

SELECT
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_name='daily_activity' AND column_name='couple_id') AS da_couple_id_must_be_0,

  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_name='daily_activity' AND column_name='couple_space_id') AS da_couple_space_id_exists,

  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_name='couple_spaces' AND column_name IN ('streak_count','last_streak_date')) AS cs_streak_columns_must_be_2,

  (SELECT COUNT(*) FROM pg_constraint
   WHERE conname='daily_activity_unique_per_day') AS unique_constraint_exists,

  (SELECT COUNT(*) FROM information_schema.tables
   WHERE table_name='streaks') AS streaks_table_must_be_0;
