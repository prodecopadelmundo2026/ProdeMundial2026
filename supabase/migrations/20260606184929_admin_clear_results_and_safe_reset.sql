CREATE OR REPLACE FUNCTION public.admin_clear_match_result(p_match_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF NOT public.current_user_is_admin() THEN
    RAISE EXCEPTION 'Sin permisos de administrador';
  END IF;

  UPDATE public.matches
  SET home_score = NULL,
      away_score = NULL,
      status = 'upcoming'
  WHERE id = p_match_id;

  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_reset_match_results()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_count int := 0;
BEGIN
  IF NOT public.current_user_is_admin() THEN
    RAISE EXCEPTION 'Sin permisos de administrador';
  END IF;

  UPDATE public.matches
  SET home_score = NULL,
      away_score = NULL,
      status = 'upcoming'
  WHERE stage IN ('group', 'round_of_32', 'round_of_16', 'quarter', 'semi', 'final', 'third_place');

  GET DIAGNOSTICS v_count = ROW_COUNT;

  UPDATE public.predictions
  SET points = NULL,
      updated_at = now()
  WHERE id IS NOT NULL;

  RETURN v_count;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_clear_match_result(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_reset_match_results() FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.admin_clear_match_result(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reset_match_results() TO authenticated;
