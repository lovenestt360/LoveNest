-- Defense-in-depth: make it explicit that authenticated clients cannot insert directly into couple_spaces.
-- Creation must happen via trusted backend functions using service role.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'couple_spaces'
      AND policyname = 'No direct inserts to couple_spaces'
  ) THEN
    EXECUTE 'DROP POLICY "No direct inserts to couple_spaces" ON public.couple_spaces';
  END IF;

  EXECUTE $sql$
    CREATE POLICY "No direct inserts to couple_spaces"
    ON public.couple_spaces
    FOR INSERT
    TO authenticated
    WITH CHECK (false)
  $sql$;
END $$;