-- Keep the persisted ranking view aligned with the audited ranking display:
-- points, exact predictions, then partial predictions. Remaining ties share rank.

DROP VIEW IF EXISTS public.ranking_entries;

CREATE VIEW public.ranking_entries
WITH (security_invoker = false) AS
SELECT
  pr.id AS user_id,
  pr.name,
  pr.avatar_url,
  COALESCE(SUM(p.points), 0)::int AS total_points,
  COUNT(*) FILTER (WHERE p.points = 3)::int AS exact_predictions,
  COUNT(*) FILTER (WHERE p.points = 1)::int AS correct_result_predictions,
  RANK() OVER (
    ORDER BY COALESCE(SUM(p.points), 0) DESC,
             COUNT(*) FILTER (WHERE p.points = 3) DESC,
             COUNT(*) FILTER (WHERE p.points = 1) DESC
  )::int AS rank
FROM public.profiles pr
INNER JOIN public.authorized_emails ae
  ON ae.email = lower(trim(pr.email))
  AND ae.active = true
LEFT JOIN public.predictions p ON p.user_id = pr.id
GROUP BY pr.id, pr.name, pr.avatar_url;

GRANT SELECT ON public.ranking_entries TO anon, authenticated;
