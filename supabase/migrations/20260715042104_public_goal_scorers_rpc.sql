CREATE OR REPLACE FUNCTION public.get_public_goal_scorers()
RETURNS TABLE (
  player_id uuid,
  player_name text,
  country_code text,
  country_name text,
  goals integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT
    p.id AS player_id,
    p.display_name AS player_name,
    p.country_code,
    p.country_name,
    v.value::integer AS goals
  FROM public.player_tournament_stat_values v
  INNER JOIN public.player_stat_types st
    ON st.id = v.stat_type_id
  INNER JOIN public.players p
    ON p.id = v.player_id
  WHERE v.tournament_key = 'world-cup-2026'
    AND st.key = 'goals'
    AND st.is_active = true
    AND v.value > 0
  ORDER BY v.value DESC, p.display_name ASC;
$$;

REVOKE ALL ON FUNCTION public.get_public_goal_scorers() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_goal_scorers() TO anon, authenticated;
