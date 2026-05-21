CREATE OR REPLACE FUNCTION public.delete_predictions_by_stages(p_stages text[])
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  deleted_count int := 0;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  IF p_stages IS NULL OR array_length(p_stages, 1) IS NULL THEN
    RETURN 0;
  END IF;

  DELETE FROM public.predictions p
  USING public.matches m
  WHERE p.match_id = m.id
    AND p.user_id = v_user_id
    AND m.stage = ANY(p_stages)
    AND m.status = 'upcoming'
    AND now() < m.locked_at;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_predictions_by_stages(text[]) TO authenticated;
