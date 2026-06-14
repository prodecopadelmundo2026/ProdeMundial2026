CREATE OR REPLACE FUNCTION public.get_match_prediction_users_by_score(
  p_match_id uuid,
  p_home_score int,
  p_away_score int
)
RETURNS TABLE (
  name text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(NULLIF(trim(pr.name), ''), 'Participante') AS name
  FROM public.predictions p
  LEFT JOIN public.profiles pr
    ON pr.id = p.user_id
  WHERE p.match_id = p_match_id
    AND p.home_score = p_home_score
    AND p.away_score = p_away_score
    AND p.home_score IS NOT NULL
    AND p.away_score IS NOT NULL
  ORDER BY name ASC;
$$;

GRANT EXECUTE ON FUNCTION public.get_match_prediction_users_by_score(uuid, int, int) TO anon, authenticated;
