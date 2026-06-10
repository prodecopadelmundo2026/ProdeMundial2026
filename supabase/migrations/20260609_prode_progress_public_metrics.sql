DROP FUNCTION IF EXISTS public.get_public_home_metrics();
DROP FUNCTION IF EXISTS public.get_public_ranking();

CREATE FUNCTION public.get_public_home_metrics()
RETURNS TABLE (
  competitors_count int,
  invitees_count int,
  prodes_loaded_count int,
  prodes_completed_count int,
  prodes_pending_count int,
  prize_pool_ars int,
  finished_matches_count int,
  ranking_mode text,
  alive_teams_count int
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH active_participants AS (
    SELECT
      pr.id AS user_id,
      ae.status
    FROM public.authorized_emails ae
    LEFT JOIN public.profiles pr
      ON lower(trim(pr.email)) = lower(trim(ae.email))
    WHERE ae.active = true
      AND ae.deleted_at IS NULL
      AND ae.status IN ('confirmed', 'trial')
  ),
  expected_counts AS (
    SELECT
      COUNT(*) FILTER (WHERE stage = 'group')::int AS group_expected,
      32::int AS knockout_expected,
      3::int AS specials_expected
    FROM public.matches
  ),
  official_results AS (
    SELECT id
    FROM public.matches
    WHERE status = 'finished'
      AND home_score IS NOT NULL
      AND away_score IS NOT NULL
  ),
  user_progress AS (
    SELECT
      ap.user_id,
      ap.status,
      COALESCE(g.count, 0)::int AS group_loaded,
      COALESCE(k.count, 0)::int AS knockout_loaded,
      COALESCE(sb.count, 0)::int AS specials_loaded,
      (ec.group_expected + ec.knockout_expected + ec.specials_expected)::int AS expected_count
    FROM active_participants ap
    CROSS JOIN expected_counts ec
    LEFT JOIN (
      SELECT p.user_id, COUNT(DISTINCT p.match_id)::int AS count
      FROM public.predictions p
      INNER JOIN public.matches m ON m.id = p.match_id
      WHERE m.stage = 'group'
      GROUP BY p.user_id
    ) g ON g.user_id = ap.user_id
    LEFT JOIN (
      SELECT user_id, COUNT(DISTINCT virtual_match_id)::int AS count
      FROM public.virtual_knockout_predictions
      GROUP BY user_id
    ) k ON k.user_id = ap.user_id
    LEFT JOIN (
      SELECT
        user_id,
        (
          CASE WHEN NULLIF(trim(COALESCE(balon, '')), '') IS NOT NULL THEN 1 ELSE 0 END +
          CASE WHEN NULLIF(trim(COALESCE(bota, '')), '') IS NOT NULL THEN 1 ELSE 0 END +
          CASE WHEN NULLIF(trim(COALESCE(guante, '')), '') IS NOT NULL THEN 1 ELSE 0 END
        )::int AS count
      FROM public.special_bets
    ) sb ON sb.user_id = ap.user_id
  ),
  loaded_prodes AS (
    SELECT user_id
    FROM user_progress
    WHERE user_id IS NOT NULL
      AND (group_loaded + knockout_loaded + specials_loaded) > 0
  ),
  completed_prodes AS (
    SELECT user_id
    FROM user_progress
    WHERE user_id IS NOT NULL
      AND expected_count > 0
      AND (group_loaded + knockout_loaded + specials_loaded) >= expected_count
  ),
  group_complete AS (
    SELECT
      COUNT(*) > 0
      AND COUNT(*) FILTER (
        WHERE status = 'finished'
          AND home_score IS NOT NULL
          AND away_score IS NOT NULL
      ) = COUNT(*) AS done
    FROM public.matches
    WHERE stage = 'group'
  ),
  group_team_stats AS (
    SELECT
      team_group,
      team,
      SUM(points)::int AS pts,
      SUM(gf)::int AS gf,
      SUM(ga)::int AS ga,
      (SUM(gf) - SUM(ga))::int AS gd
    FROM (
      SELECT
        m."group" AS team_group,
        m.home_team AS team,
        CASE
          WHEN m.home_score > m.away_score THEN 3
          WHEN m.home_score = m.away_score THEN 1
          ELSE 0
        END AS points,
        m.home_score AS gf,
        m.away_score AS ga
      FROM public.matches m
      WHERE m.stage = 'group'
        AND m.status = 'finished'
        AND m.home_score IS NOT NULL
        AND m.away_score IS NOT NULL
      UNION ALL
      SELECT
        m."group" AS team_group,
        m.away_team AS team,
        CASE
          WHEN m.away_score > m.home_score THEN 3
          WHEN m.away_score = m.home_score THEN 1
          ELSE 0
        END AS points,
        m.away_score AS gf,
        m.home_score AS ga
      FROM public.matches m
      WHERE m.stage = 'group'
        AND m.status = 'finished'
        AND m.home_score IS NOT NULL
        AND m.away_score IS NOT NULL
    ) rows
    GROUP BY team_group, team
  ),
  ranked_group_teams AS (
    SELECT
      *,
      row_number() OVER (
        PARTITION BY team_group
        ORDER BY pts DESC, gd DESC, gf DESC, team ASC
      ) AS group_rank
    FROM group_team_stats
  ),
  best_thirds AS (
    SELECT team
    FROM (
      SELECT
        *,
        row_number() OVER (ORDER BY pts DESC, gd DESC, gf DESC, team ASC) AS third_rank
      FROM ranked_group_teams
      WHERE group_rank = 3
    ) thirds
    WHERE third_rank <= 8
  ),
  group_alive AS (
    SELECT COUNT(DISTINCT team)::int AS count
    FROM (
      SELECT team FROM ranked_group_teams WHERE group_rank <= 2
      UNION
      SELECT team FROM best_thirds
    ) alive
  ),
  knockout_winners AS (
    SELECT
      CASE
        WHEN home_score > away_score THEN home_team
        WHEN away_score > home_score THEN away_team
        ELSE NULL
      END AS team
    FROM public.matches
    WHERE stage <> 'group'
      AND status = 'finished'
      AND home_score IS NOT NULL
      AND away_score IS NOT NULL
  ),
  knockout_pending_teams AS (
    SELECT home_team AS team
    FROM public.matches
    WHERE stage <> 'group'
      AND status <> 'finished'
    UNION ALL
    SELECT away_team AS team
    FROM public.matches
    WHERE stage <> 'group'
      AND status <> 'finished'
  ),
  knockout_alive AS (
    SELECT COUNT(DISTINCT team)::int AS count
    FROM (
      SELECT team FROM knockout_winners
      UNION ALL
      SELECT team FROM knockout_pending_teams
    ) teams
    WHERE team IS NOT NULL
      AND length(trim(team)) > 0
      AND team !~* '^(ganador|perdedor|winner|loser|[0-9]+\s*(°|º)?\s*(grupo|group)|[123][a-l]$)'
  )
  SELECT
    (SELECT COUNT(*) FROM active_participants WHERE status = 'confirmed')::int AS competitors_count,
    (SELECT COUNT(*) FROM active_participants WHERE status = 'trial')::int AS invitees_count,
    (SELECT COUNT(*) FROM loaded_prodes)::int AS prodes_loaded_count,
    (SELECT COUNT(*) FROM completed_prodes)::int AS prodes_completed_count,
    (
      SELECT COUNT(*)
      FROM active_participants ap
      WHERE ap.status = 'confirmed'
        AND ap.user_id IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM completed_prodes cp WHERE cp.user_id = ap.user_id)
    )::int AS prodes_pending_count,
    ((SELECT COUNT(*) FROM active_participants WHERE status = 'confirmed') * 20000)::int AS prize_pool_ars,
    (
      SELECT COUNT(*)
      FROM official_results
    )::int AS finished_matches_count,
    CASE
      WHEN (SELECT COUNT(*) FROM official_results) > 0 THEN 'live_world_cup'
      ELSE 'pre_world_cup'
    END AS ranking_mode,
    CASE
      WHEN (SELECT count FROM knockout_alive) > 0 THEN (SELECT count FROM knockout_alive)
      WHEN (SELECT done FROM group_complete) THEN COALESCE((SELECT count FROM group_alive), 48)
      ELSE 48
    END::int AS alive_teams_count;
$$;

CREATE FUNCTION public.get_public_ranking()
RETURNS TABLE (
  user_id uuid,
  name text,
  avatar_url text,
  total_points int,
  exact_predictions int,
  correct_result_predictions int,
  incorrect_predictions int,
  predictions_count int,
  loaded_count int,
  expected_count int,
  progress_percentage int,
  missing_sections text[],
  prode_status text,
  participant_status text,
  rank int
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH participants AS (
    SELECT
      pr.id AS user_id,
      COALESCE(NULLIF(pr.name, ''), NULLIF(ae.label, ''), 'Participante') AS name,
      pr.avatar_url,
      ae.status AS participant_status
    FROM public.authorized_emails ae
    INNER JOIN public.profiles pr
      ON lower(trim(pr.email)) = lower(trim(ae.email))
    WHERE ae.active = true
      AND ae.deleted_at IS NULL
      AND ae.status IN ('confirmed', 'trial')
  ),
  expected_counts AS (
    SELECT
      COUNT(*) FILTER (WHERE stage = 'group')::int AS group_expected,
      32::int AS knockout_expected,
      3::int AS specials_expected
    FROM public.matches
  ),
  official_results AS (
    SELECT id
    FROM public.matches
    WHERE status = 'finished'
      AND home_score IS NOT NULL
      AND away_score IS NOT NULL
  ),
  group_counts AS (
    SELECT p.user_id, COUNT(DISTINCT p.match_id)::int AS count
    FROM public.predictions p
    INNER JOIN public.matches m ON m.id = p.match_id
    WHERE m.stage = 'group'
    GROUP BY p.user_id
  ),
  knockout_counts AS (
    SELECT user_id, COUNT(DISTINCT virtual_match_id)::int AS count
    FROM public.virtual_knockout_predictions
    GROUP BY user_id
  ),
  specials_counts AS (
    SELECT
      user_id,
      (
        CASE WHEN NULLIF(trim(COALESCE(balon, '')), '') IS NOT NULL THEN 1 ELSE 0 END +
        CASE WHEN NULLIF(trim(COALESCE(bota, '')), '') IS NOT NULL THEN 1 ELSE 0 END +
        CASE WHEN NULLIF(trim(COALESCE(guante, '')), '') IS NOT NULL THEN 1 ELSE 0 END
      )::int AS count
    FROM public.special_bets
  ),
  progress AS (
    SELECT
      participants.user_id,
      COALESCE(group_counts.count, 0)::int AS group_loaded,
      expected_counts.group_expected,
      COALESCE(knockout_counts.count, 0)::int AS knockout_loaded,
      expected_counts.knockout_expected,
      COALESCE(specials_counts.count, 0)::int AS specials_loaded,
      expected_counts.specials_expected
    FROM participants
    CROSS JOIN expected_counts
    LEFT JOIN group_counts ON group_counts.user_id = participants.user_id
    LEFT JOIN knockout_counts ON knockout_counts.user_id = participants.user_id
    LEFT JOIN specials_counts ON specials_counts.user_id = participants.user_id
  ),
  loaded_counts AS (
    SELECT
      user_id,
      (group_loaded + knockout_loaded + specials_loaded)::int AS loaded_count,
      (group_expected + knockout_expected + specials_expected)::int AS expected_count,
      LEAST(
        100,
        CASE
          WHEN (group_expected + knockout_expected + specials_expected) > 0
            THEN ROUND(((group_loaded + knockout_loaded + specials_loaded)::numeric / (group_expected + knockout_expected + specials_expected)::numeric) * 100)::int
          ELSE 0
        END
      )::int AS progress_percentage,
      array_remove(ARRAY[
        CASE WHEN group_loaded < group_expected THEN 'fase de grupos' END,
        CASE WHEN knockout_loaded < knockout_expected THEN 'eliminatorias' END,
        CASE WHEN specials_loaded < specials_expected THEN 'apuestas especiales' END
      ], NULL)::text[] AS missing_sections
    FROM progress
  ),
  scored AS (
    SELECT
      p.user_id,
      COALESCE(SUM(p.points), 0)::int AS total_points,
      COUNT(*) FILTER (WHERE p.points = 3)::int AS exact_predictions,
      COUNT(*) FILTER (WHERE p.points = 1)::int AS correct_result_predictions,
      COUNT(*) FILTER (WHERE p.points = 0)::int AS incorrect_predictions
    FROM public.predictions p
    INNER JOIN official_results r ON r.id = p.match_id
    GROUP BY p.user_id
  ),
  merged AS (
    SELECT
      participants.user_id,
      participants.name,
      participants.avatar_url,
      COALESCE(scored.total_points, 0)::int AS total_points,
      COALESCE(scored.exact_predictions, 0)::int AS exact_predictions,
      COALESCE(scored.correct_result_predictions, 0)::int AS correct_result_predictions,
      COALESCE(scored.incorrect_predictions, 0)::int AS incorrect_predictions,
      COALESCE(loaded_counts.loaded_count, 0)::int AS predictions_count,
      COALESCE(loaded_counts.loaded_count, 0)::int AS loaded_count,
      COALESCE(loaded_counts.expected_count, 0)::int AS expected_count,
      COALESCE(loaded_counts.progress_percentage, 0)::int AS progress_percentage,
      COALESCE(loaded_counts.missing_sections, ARRAY[]::text[]) AS missing_sections,
      CASE
        WHEN COALESCE(loaded_counts.progress_percentage, 0) >= 100 THEN 'completed'
        WHEN COALESCE(loaded_counts.progress_percentage, 0) >= 70 THEN 'almost_done'
        WHEN COALESCE(loaded_counts.loaded_count, 0) > 0 THEN 'in_progress'
        ELSE 'not_started'
      END AS prode_status,
      participants.participant_status
    FROM participants
    LEFT JOIN scored ON scored.user_id = participants.user_id
    LEFT JOIN loaded_counts ON loaded_counts.user_id = participants.user_id
  ),
  ranked AS (
    SELECT
      *,
      CASE
        WHEN participant_status = 'confirmed' THEN
          rank() OVER (
            PARTITION BY participant_status
            ORDER BY total_points DESC, exact_predictions DESC, correct_result_predictions DESC, name ASC
          )::int
        ELSE 0
      END AS rank
    FROM merged
  )
  SELECT
    ranked.user_id,
    ranked.name,
    ranked.avatar_url,
    ranked.total_points,
    ranked.exact_predictions,
    ranked.correct_result_predictions,
    ranked.incorrect_predictions,
    ranked.predictions_count,
    ranked.loaded_count,
    ranked.expected_count,
    ranked.progress_percentage,
    ranked.missing_sections,
    ranked.prode_status,
    ranked.participant_status,
    ranked.rank
  FROM ranked
  ORDER BY
    CASE WHEN participant_status = 'confirmed' THEN 0 ELSE 1 END,
    CASE WHEN (SELECT COUNT(*) FROM official_results) = 0 THEN progress_percentage END DESC NULLS LAST,
    CASE WHEN (SELECT COUNT(*) FROM official_results) = 0 THEN name END ASC NULLS LAST,
    rank NULLS LAST,
    name ASC;
$$;

REVOKE ALL ON FUNCTION public.get_public_home_metrics() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_public_ranking() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.get_public_home_metrics() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_ranking() TO anon, authenticated;
