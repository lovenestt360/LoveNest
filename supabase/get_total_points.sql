CREATE OR REPLACE FUNCTION public.get_total_points(p_couple_id UUID)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_points INT;
BEGIN
  SELECT total_points INTO v_points
  FROM public.points
  WHERE couple_space_id = p_couple_id;
  
  RETURN COALESCE(v_points, 0);
END;
$$;
