-- Atomic function to delete a couple space and ALL its data.
-- Caller must be a member of the space. Runs as SECURITY DEFINER (bypasses RLS)
-- so it can touch all tables regardless of per-table policies.
-- Tables with ON DELETE CASCADE on couple_space_id are cleaned automatically
-- when the couple_spaces row is deleted. Tables without CASCADE are deleted first.

CREATE OR REPLACE FUNCTION public.delete_couple_space(p_couple_space_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Authorization: caller must be a member of this space
  IF NOT EXISTS (
    SELECT 1 FROM members
    WHERE user_id = auth.uid()
      AND couple_space_id = p_couple_space_id
  ) THEN
    RAISE EXCEPTION 'Não tens permissão para eliminar este espaço';
  END IF;

  -- Delete child-before-parent for non-cascade tables that have intra-table FKs
  DELETE FROM photo_comments   WHERE couple_space_id = p_couple_space_id;
  DELETE FROM photos           WHERE couple_space_id = p_couple_space_id;
  DELETE FROM albums           WHERE couple_space_id = p_couple_space_id;

  DELETE FROM complaint_messages WHERE couple_space_id = p_couple_space_id;
  DELETE FROM complaints         WHERE couple_space_id = p_couple_space_id;

  DELETE FROM tasks            WHERE couple_space_id = p_couple_space_id;
  DELETE FROM events           WHERE couple_space_id = p_couple_space_id;
  DELETE FROM schedule_blocks  WHERE couple_space_id = p_couple_space_id;

  DELETE FROM push_subscriptions   WHERE couple_space_id = p_couple_space_id;
  DELETE FROM daily_prayers        WHERE couple_space_id = p_couple_space_id;
  DELETE FROM daily_spiritual_logs WHERE couple_space_id = p_couple_space_id;

  DELETE FROM daily_symptoms WHERE couple_space_id = p_couple_space_id;
  DELETE FROM period_entries WHERE couple_space_id = p_couple_space_id;
  DELETE FROM cycle_profiles WHERE couple_space_id = p_couple_space_id;

  -- plano_items may exist without a migration file (created via console)
  BEGIN
    DELETE FROM plano_items WHERE couple_space_id = p_couple_space_id;
  EXCEPTION WHEN undefined_table THEN
    NULL;
  END;

  -- Fasting rows use ON DELETE SET NULL — no action needed; couple_space_id
  -- will become NULL automatically when couple_spaces row is deleted below.

  -- Delete the couple space itself — cascades 36+ dependent tables automatically
  DELETE FROM couple_spaces WHERE id = p_couple_space_id;
END;
$$;

-- Grant execute to authenticated users only (caller still needs to be a member)
REVOKE ALL ON FUNCTION public.delete_couple_space(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_couple_space(uuid) TO authenticated;
