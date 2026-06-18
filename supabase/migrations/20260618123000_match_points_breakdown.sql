-- Public transparency view for finished match points.
-- Uses the same confirmed competitor universe as public ranking/statistics:
-- authorized_emails.status = confirmed, active = true, deleted_at IS NULL.
-- Each user counts once per match, using the latest prediction row defensively.

CREATE OR REPLACE FUNCTION public.get_match_points_breakdown(p_match_id uuid)
RETURNS TABLE (
  user_id uuid,
  name text,
  home_score int,
  away_score int,
  points int
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
      p.away_score,
      COALESCE(p.points, 0)::int AS points
    FROM public.predictions p
    INNER JOIN confirmed_competitors c
      ON c.user_id = p.user_id
    INNER JOIN public.matches m
      ON m.id = p.match_id
    WHERE p.match_id = p_match_id
      AND m.status = 'finished'
      AND m.home_score IS NOT NULL
      AND m.away_score IS NOT NULL
      AND p.home_score IS NOT NULL
      AND p.away_score IS NOT NULL
    ORDER BY p.user_id, p.updated_at DESC, p.created_at DESC, p.id DESC
  )
  SELECT
    p.user_id,
    c.name,
    p.home_score,
    p.away_score,
    p.points
  FROM latest_predictions p
  INNER JOIN confirmed_competitors c
    ON c.user_id = p.user_id
  ORDER BY p.points DESC, c.name ASC;
$$;

GRANT EXECUTE ON FUNCTION public.get_match_points_breakdown(uuid) TO anon, authenticated;
