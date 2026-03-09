-- Fix RLS infinite recursion on members by moving membership checks into SECURITY DEFINER helpers

BEGIN;

-- 1) Helper: current user's couple_space_id
CREATE OR REPLACE FUNCTION public.current_couple_space_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT couple_space_id
  FROM public.members
  WHERE user_id = auth.uid()
  LIMIT 1;
$$;

-- 2) Helper: is current user member of a given couple_space
CREATE OR REPLACE FUNCTION public.is_member_of_couple_space(_couple_space_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.members
    WHERE couple_space_id = _couple_space_id
      AND user_id = auth.uid()
  );
$$;

-- 3) Helper: are current user and another user in the same couple space?
CREATE OR REPLACE FUNCTION public.are_users_in_same_couple_space(_other_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.members me
    JOIN public.members other
      ON other.couple_space_id = me.couple_space_id
    WHERE me.user_id = auth.uid()
      AND other.user_id = _other_user_id
  );
$$;

-- 4) Keep existing public APIs but make them robust too (avoid RLS recursion)
CREATE OR REPLACE FUNCTION public.get_user_couple_space_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT couple_space_id
  FROM public.members
  WHERE user_id = auth.uid()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_member_of_space(_couple_space_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.members
    WHERE couple_space_id = _couple_space_id
      AND user_id = _user_id
  );
$$;

-- 5) Policies: MEMBERS (remove recursive policy)
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view members of their space" ON public.members;

CREATE POLICY "Members can view members of their space"
ON public.members
FOR SELECT
USING (public.is_member_of_couple_space(public.members.couple_space_id));

-- Keep existing INSERT policy as-is

-- 6) Policies: COUPLE_SPACES (use helper without recursion)
ALTER TABLE public.couple_spaces ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view their couple space" ON public.couple_spaces;
DROP POLICY IF EXISTS "Members can update their couple space" ON public.couple_spaces;

CREATE POLICY "Members can view their couple space"
ON public.couple_spaces
FOR SELECT
USING (public.is_member_of_couple_space(public.couple_spaces.id));

CREATE POLICY "Members can update their couple space"
ON public.couple_spaces
FOR UPDATE
USING (public.is_member_of_couple_space(public.couple_spaces.id));

-- 7) Policies: PROFILES (avoid joins on members under RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view partner profile" ON public.profiles;

CREATE POLICY "Users can view partner profile"
ON public.profiles
FOR SELECT
USING (public.are_users_in_same_couple_space(public.profiles.user_id));

COMMIT;