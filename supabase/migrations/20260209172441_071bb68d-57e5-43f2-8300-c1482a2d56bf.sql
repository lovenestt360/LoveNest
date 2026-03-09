-- Enforce the 2-members-per-couple-space rule atomically at the database level

CREATE OR REPLACE FUNCTION public.enforce_member_limit_per_couple_space()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  member_count integer;
BEGIN
  -- Serialize joins per couple space by locking the parent row
  PERFORM 1
  FROM public.couple_spaces
  WHERE id = NEW.couple_space_id
  FOR UPDATE;

  SELECT COUNT(*) INTO member_count
  FROM public.members
  WHERE couple_space_id = NEW.couple_space_id;

  IF member_count >= 2 THEN
    RAISE EXCEPTION 'couple_space_full'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_member_limit_per_couple_space ON public.members;

CREATE TRIGGER trg_enforce_member_limit_per_couple_space
BEFORE INSERT ON public.members
FOR EACH ROW
EXECUTE FUNCTION public.enforce_member_limit_per_couple_space();
