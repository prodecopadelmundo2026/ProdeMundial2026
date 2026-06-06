CREATE OR REPLACE FUNCTION public.get_public_home_metrics()
RETURNS TABLE (
  competitors_count int,
  invitees_count int,
  prodes_loaded_count int,
  finished_matches_count int,
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
  loaded_prodes AS (
    SELECT DISTINCT user_id
    FROM public.predictions
    UNION
    SELECT DISTINCT user_id
    FROM public.virtual_knockout_predictions
    UNION
    SELECT DISTINCT user_id
    FROM public.user_prediction_tiebreakers
    UNION
    SELECT DISTINCT user_id
    FROM public.special_bets
    WHERE balon IS NOT NULL OR bota IS NOT NULL OR guante IS NOT NULL
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
      AND team !~* '^(ganador|perdedor|winner|loser|[0-9]+\s*(°|º|Â°)?\s*(grupo|group)|[123][a-l]$)'
  )
  SELECT
    (SELECT COUNT(*) FROM active_participants WHERE status = 'confirmed')::int AS competitors_count,
    (SELECT COUNT(*) FROM active_participants WHERE status = 'trial')::int AS invitees_count,
    (
      SELECT COUNT(*)
      FROM active_participants ap
      WHERE ap.user_id IS NOT NULL
        AND EXISTS (SELECT 1 FROM loaded_prodes lp WHERE lp.user_id = ap.user_id)
    )::int AS prodes_loaded_count,
    (
      SELECT COUNT(*)
      FROM public.matches
      WHERE status = 'finished'
    )::int AS finished_matches_count,
    CASE
      WHEN (SELECT count FROM knockout_alive) > 0 THEN (SELECT count FROM knockout_alive)
      WHEN (SELECT done FROM group_complete) THEN COALESCE((SELECT count FROM group_alive), 48)
      ELSE 48
    END::int AS alive_teams_count;
$$;

CREATE OR REPLACE FUNCTION public.get_public_ranking()
RETURNS TABLE (
  user_id uuid,
  name text,
  avatar_url text,
  total_points int,
  exact_predictions int,
  correct_result_predictions int,
  incorrect_predictions int,
  predictions_count int,
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
  loaded_counts AS (
    SELECT user_id, COUNT(*)::int AS count
    FROM (
      SELECT user_id FROM public.predictions
      UNION ALL
      SELECT user_id FROM public.virtual_knockout_predictions
      UNION ALL
      SELECT user_id FROM public.user_prediction_tiebreakers
      UNION ALL
      SELECT user_id FROM public.special_bets
      WHERE balon IS NOT NULL OR bota IS NOT NULL OR guante IS NOT NULL
    ) rows
    GROUP BY user_id
  ),
  scored AS (
    SELECT
      p.user_id,
      COALESCE(SUM(p.points), 0)::int AS total_points,
      COUNT(*) FILTER (WHERE p.points = 3)::int AS exact_predictions,
      COUNT(*) FILTER (WHERE p.points = 1)::int AS correct_result_predictions,
      COUNT(*) FILTER (WHERE p.points = 0)::int AS incorrect_predictions
    FROM public.predictions p
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
      COALESCE(loaded_counts.count, 0)::int AS predictions_count,
      CASE WHEN COALESCE(loaded_counts.count, 0) > 0 THEN 'in_progress' ELSE 'empty' END AS prode_status,
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
    ranked.prode_status,
    ranked.participant_status,
    ranked.rank
  FROM ranked
  ORDER BY
    CASE WHEN participant_status = 'confirmed' THEN 0 ELSE 1 END,
    rank NULLS LAST,
    name ASC;
$$;

CREATE OR REPLACE FUNCTION public.get_public_prediction_detail(p_user_id uuid)
RETURNS jsonb
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
  allowed_users AS (
    SELECT user_id FROM participants
  )
  SELECT jsonb_build_object(
    'participant',
      (
        SELECT to_jsonb(p)
        FROM participants p
        WHERE p.user_id = p_user_id
      ),
    'participants',
      COALESCE((SELECT jsonb_agg(to_jsonb(p) ORDER BY p.name) FROM participants p), '[]'::jsonb),
    'matches',
      COALESCE((
        SELECT jsonb_agg(to_jsonb(m) ORDER BY m.scheduled_at)
        FROM (
          SELECT
            id,
            home_team,
            away_team,
            home_score,
            away_score,
            scheduled_at,
            locked_at,
            stage,
            "group",
            status,
            created_at
          FROM public.matches
        ) m
      ), '[]'::jsonb),
    'predictions',
      COALESCE((
        SELECT jsonb_agg(to_jsonb(p))
        FROM (
          SELECT
            id,
            user_id,
            match_id,
            home_score,
            away_score,
            points,
            tiebreaker_team,
            created_at,
            updated_at
          FROM public.predictions
          WHERE user_id IN (SELECT user_id FROM allowed_users)
        ) p
      ), '[]'::jsonb),
    'virtual_predictions',
      COALESCE((
        SELECT jsonb_agg(to_jsonb(vp))
        FROM (
          SELECT
            id,
            user_id,
            virtual_match_id,
            home_score,
            away_score,
            tiebreaker_team,
            created_at,
            updated_at
          FROM public.virtual_knockout_predictions
          WHERE user_id IN (SELECT user_id FROM allowed_users)
        ) vp
      ), '[]'::jsonb),
    'tiebreakers',
      COALESCE((
        SELECT jsonb_agg(to_jsonb(tb))
        FROM (
          SELECT
            user_id,
            tiebreaker_key,
            team
          FROM public.user_prediction_tiebreakers
          WHERE user_id IN (SELECT user_id FROM allowed_users)
        ) tb
      ), '[]'::jsonb),
    'special_bets',
      (
        SELECT to_jsonb(sb)
        FROM (
          SELECT
            balon,
            bota,
            guante
          FROM public.special_bets
          WHERE user_id = p_user_id
            AND user_id IN (SELECT user_id FROM allowed_users)
        ) sb
      )
  );
$$;

REVOKE ALL ON FUNCTION public.get_public_home_metrics() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_public_ranking() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_public_prediction_detail(uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.get_public_home_metrics() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_ranking() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_prediction_detail(uuid) TO anon, authenticated;

DROP POLICY IF EXISTS matches_select_public ON public.matches;
CREATE POLICY matches_select_public
  ON public.matches FOR SELECT TO anon, authenticated
  USING (true);

GRANT SELECT ON public.matches TO anon, authenticated;
