-- ─────────────────────────────────────────────────────────────────────────────
-- FIX: update_streak — break streak immediately on app open (no check-in needed)
--
-- Bug: update_streak had an early RETURN if v_today_count < v_members.
-- This meant the streak was never broken until both users did a check-in.
-- Users would see stale streak counts (e.g., 8 days) even after missing a day.
--
-- Fix: load streak state FIRST, detect break BEFORE the activity count check.
-- When shields are insufficient: break to 0 immediately and RETURN.
-- When shields are sufficient: fall through — existing logic handles consume+increment
-- when both users eventually check in.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.update_streak(p_couple_space_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today       DATE := CURRENT_DATE;
  v_today_count INT;
  v_members     INT;
  v_last_date   DATE;
  v_current     INT;
  v_longest     INT;
  v_shields     INT;
  v_gap         INT;
  v_new_streak  INT;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext(p_couple_space_id::TEXT));

  SELECT COUNT(*) INTO v_members
  FROM public.members WHERE couple_space_id = p_couple_space_id;
  IF v_members < 2 THEN RETURN; END IF;

  -- Load current streak state BEFORE checking today's activity.
  -- This allows break detection to run regardless of whether anyone has checked in.
  SELECT COALESCE(streak_count, 0), last_streak_date, COALESCE(longest_streak, 0)
  INTO v_current, v_last_date, v_longest
  FROM public.couple_spaces WHERE id = p_couple_space_id FOR UPDATE;
  IF NOT FOUND THEN RETURN; END IF;
  IF v_last_date = v_today THEN RETURN; END IF;

  -- ── Eager break detection ─────────────────────────────────────────────────
  -- Runs on every refresh, not just when both users are active.
  -- Only breaks when gap > available shields; otherwise fall through to
  -- existing increment+shield logic that runs when both users check in.
  IF v_current > 0
     AND v_last_date IS NOT NULL
     AND v_last_date < (v_today - INTERVAL '1 day')::DATE
  THEN
    v_gap := GREATEST((v_today - v_last_date) - 1, 0);

    SELECT COALESCE(shields, 0) INTO v_shields
    FROM public.love_shields WHERE couple_space_id = p_couple_space_id;

    IF COALESCE(v_shields, 0) < v_gap THEN
      -- Shields cannot cover the gap: streak is broken now.
      IF COALESCE(v_shields, 0) > 0 THEN
        UPDATE public.love_shields
        SET shields               = 0,
            last_shield_used_date = v_today,
            updated_at            = now()
        WHERE couple_space_id = p_couple_space_id;
      END IF;

      UPDATE public.couple_spaces
      SET streak_count     = 0,
          last_streak_date = NULL
      WHERE id = p_couple_space_id;

      RETURN;
    END IF;
    -- Shields sufficient: do NOT consume here.
    -- get_streak() will consume shields and update last_streak_date to yesterday,
    -- so the next update_streak call (on check-in) sees gap=0 and increments cleanly.
  END IF;

  -- ── Increment gate: both users must be active today ───────────────────────
  SELECT COUNT(DISTINCT user_id) INTO v_today_count
  FROM public.daily_activity
  WHERE couple_space_id = p_couple_space_id AND activity_date = v_today;
  IF v_today_count < v_members THEN RETURN; END IF;

  -- Recalculate gap (last_streak_date may have been updated to yesterday by get_streak)
  v_gap := CASE
    WHEN v_last_date IS NULL THEN 0
    ELSE GREATEST((v_today - v_last_date) - 1, 0)
  END;

  IF v_gap = 0 THEN
    -- Consecutive day: increment streak
    v_new_streak := v_current + 1;
    UPDATE public.couple_spaces
    SET streak_count     = v_new_streak,
        last_streak_date = v_today,
        longest_streak   = GREATEST(COALESCE(longest_streak, 0), v_new_streak)
    WHERE id = p_couple_space_id;

  ELSIF v_gap >= 1 THEN
    -- Gap with sufficient shields (insufficient case already returned above)
    SELECT COALESCE(shields, 0) INTO v_shields
    FROM public.love_shields WHERE couple_space_id = p_couple_space_id;

    IF COALESCE(v_shields, 0) >= v_gap THEN
      UPDATE public.love_shields
      SET shields               = GREATEST(shields - v_gap, 0),
          last_shield_used_date = v_today,
          updated_at            = now()
      WHERE couple_space_id = p_couple_space_id;

      v_new_streak := v_current + 1;
      UPDATE public.couple_spaces
      SET streak_count     = v_new_streak,
          last_streak_date = v_today,
          longest_streak   = GREATEST(COALESCE(longest_streak, 0), v_new_streak)
      WHERE id = p_couple_space_id;

    ELSE
      -- get_streak may have already consumed shields and updated last_streak_date to yesterday.
      -- In that case v_gap should be 0 above. Safety fallback: treat as day 1.
      UPDATE public.couple_spaces
      SET streak_count     = 1,
          last_streak_date = v_today
      WHERE id = p_couple_space_id;
    END IF;
  END IF;

  -- +10 points for a complete day
  INSERT INTO public.points (couple_space_id, total_points)
  VALUES (p_couple_space_id, 10)
  ON CONFLICT (couple_space_id)
  DO UPDATE SET total_points = public.points.total_points + 10, updated_at = now();

END;
$$;

GRANT EXECUTE ON FUNCTION public.update_streak(UUID) TO authenticated;

NOTIFY pgrst, 'reload schema';
