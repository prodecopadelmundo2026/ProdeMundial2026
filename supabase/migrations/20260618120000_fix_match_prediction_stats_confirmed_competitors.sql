-- Keep public match prediction statistics on the same competitive universe as
-- the official ranking and home competitor count:
-- authorized_emails.status = confirmed, active = true, deleted_at IS NULL.
-- Each user counts once per match, using the latest prediction row defensively.

CREATE OR REPLACE FUNCTION public.get_match_prediction_insights(p_match_id uuid)
RETURNS TABLE (
  home_count int,
  draw_count int,
  away_count int,
  total_count int,
  most_picked_home_score int,
  most_picked_away_score int,
  most_picked_count int,
  least_picked_home_score int,
  least_picked_away_score int,
  least_picked_count int,
  distinct_results_count int,
  avg_home_score numeric,
  avg_away_score numeric,
  away_goal_count int,
  clean_sheet_home_count int
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH confirmed_competitors AS (
    SELECT pr.id AS user_id
    FROM public.authorized_emails ae
    INNER JOIN public.profiles pr
      ON lower(trim(pr.email)) = lower(trim(ae.email))
    WHERE ae.active = true
      AND ae.deleted_at IS NULL
      AND ae.status = 'confirmed'
  ),
  latest_predictions AS (
    SELECT DISTINCT ON (p.user_id)
      p.user_id,
      p.home_score,
      p.away_score
    FROM public.predictions p
    INNER JOIN confirmed_competitors c
      ON c.user_id = p.user_id
    WHERE p.match_id = p_match_id
      AND p.home_score IS NOT NULL
      AND p.away_score IS NOT NULL
    ORDER BY p.user_id, p.updated_at DESC, p.created_at DESC, p.id DESC
  ),
  totals AS (
    SELECT
      COUNT(*)::int AS total_count,
      COUNT(*) FILTER (WHERE home_score > away_score)::int AS home_count,
      COUNT(*) FILTER (WHERE home_score = away_score)::int AS draw_count,
      COUNT(*) FILTER (WHERE home_score < away_score)::int AS away_count,
      ROUND(AVG(home_score)::numeric, 1) AS avg_home_score,
      ROUND(AVG(away_score)::numeric, 1) AS avg_away_score,
      COUNT(*) FILTER (WHERE away_score >= 1)::int AS away_goal_count,
      COUNT(*) FILTER (WHERE away_score = 0)::int AS clean_sheet_home_count
    FROM latest_predictions
  ),
  result_counts AS (
    SELECT
      home_score,
      away_score,
      COUNT(*)::int AS picked_count
    FROM latest_predictions
    GROUP BY home_score, away_score
  ),
  most_picked AS (
    SELECT home_score, away_score, picked_count
    FROM result_counts
    ORDER BY picked_count DESC, home_score ASC, away_score ASC
    LIMIT 1
  ),
  least_picked AS (
    SELECT home_score, away_score, picked_count
    FROM result_counts
    ORDER BY picked_count ASC, home_score ASC, away_score ASC
    LIMIT 1
  )
  SELECT
    COALESCE(t.home_count, 0),
    COALESCE(t.draw_count, 0),
    COALESCE(t.away_count, 0),
    COALESCE(t.total_count, 0),
    mp.home_score,
    mp.away_score,
    COALESCE(mp.picked_count, 0),
    lp.home_score,
    lp.away_score,
    COALESCE(lp.picked_count, 0),
    (SELECT COUNT(*)::int FROM result_counts),
    COALESCE(t.avg_home_score, 0),
    COALESCE(t.avg_away_score, 0),
    COALESCE(t.away_goal_count, 0),
    COALESCE(t.clean_sheet_home_count, 0)
  FROM totals t
  LEFT JOIN most_picked mp ON true
  LEFT JOIN least_picked lp ON true;
$$;

CREATE OR REPLACE FUNCTION public.get_match_prediction_result_distribution(p_match_id uuid)
RETURNS TABLE (
  home_score int,
  away_score int,
  picked_count int
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH confirmed_competitors AS (
    SELECT pr.id AS user_id
    FROM public.authorized_emails ae
    INNER JOIN public.profiles pr
      ON lower(trim(pr.email)) = lower(trim(ae.email))
    WHERE ae.active = true
      AND ae.deleted_at IS NULL
      AND ae.status = 'confirmed'
  ),
  latest_predictions AS (
    SELECT DISTINCT ON (p.user_id)
      p.user_id,
      p.home_score,
      p.away_score
    FROM public.predictions p
    INNER JOIN confirmed_competitors c
      ON c.user_id = p.user_id
    WHERE p.match_id = p_match_id
      AND p.home_score IS NOT NULL
      AND p.away_score IS NOT NULL
    ORDER BY p.user_id, p.updated_at DESC, p.created_at DESC, p.id DESC
  )
  SELECT
    p.home_score,
    p.away_score,
    COUNT(*)::int AS picked_count
  FROM latest_predictions p
  GROUP BY p.home_score, p.away_score
  ORDER BY picked_count DESC, p.home_score ASC, p.away_score ASC;
$$;

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
  WITH confirmed_competitors AS (
    SELECT
      pr.id AS user_id,
      COALESCE(NULLIF(trim(pr.name), ''), NULLIF(trim(ae.label), ''), split_part(ae.email, '@', 1), 'Participante') AS name
    FROM public.authorized_emails ae
    INNER JOIN public.profiles pr
      ON lower(trim(pr.email)) = lower(trim(ae.email))
    WHERE ae.active = true
      AND ae.deleted_at IS NULL
      AND ae.status = 'confirmed'
  ),
  latest_predictions AS (
    SELECT DISTINCT ON (p.user_id)
      p.user_id,
      p.home_score,
      p.away_score
    FROM public.predictions p
    INNER JOIN confirmed_competitors c
      ON c.user_id = p.user_id
    WHERE p.match_id = p_match_id
      AND p.home_score IS NOT NULL
      AND p.away_score IS NOT NULL
    ORDER BY p.user_id, p.updated_at DESC, p.created_at DESC, p.id DESC
  )
  SELECT c.name
  FROM latest_predictions p
  INNER JOIN confirmed_competitors c
    ON c.user_id = p.user_id
  WHERE p.home_score = p_home_score
    AND p.away_score = p_away_score
  ORDER BY c.name ASC;
$$;

GRANT EXECUTE ON FUNCTION public.get_match_prediction_insights(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_match_prediction_result_distribution(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_match_prediction_users_by_score(uuid, int, int) TO anon, authenticated;
