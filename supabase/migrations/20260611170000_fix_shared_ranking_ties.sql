-- Ranking compartido real:
-- misma linea competitiva = puntos, exactas, parciales e incorrectas iguales.
-- El nombre solo ordena visualmente dentro del mismo puesto, no desempata.

DROP FUNCTION IF EXISTS public.get_public_ranking();

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
SECURITY DEFINER
SET search_path = public
AS $$
  WITH participants AS (
    SELECT
      p.id AS user_id,
      COALESCE(NULLIF(TRIM(p.name), ''), SPLIT_PART(COALESCE(p.email, ''), '@', 1), 'Participante') AS name,
      p.avatar_url,
      CASE
        WHEN ae.status = 'trial' THEN 'trial'
        ELSE 'confirmed'
      END AS participant_status
    FROM public.profiles p
    INNER JOIN public.authorized_emails ae
      ON LOWER(ae.email) = LOWER(p.email)
    WHERE ae.deleted_at IS NULL
      AND COALESCE(ae.active, true) = true
      AND COALESCE(ae.status, 'confirmed') IN ('confirmed', 'trial')
  ),
  official_results AS (
    SELECT id
    FROM public.matches
    WHERE status = 'finished'
      AND home_score IS NOT NULL
      AND away_score IS NOT NULL
  ),
  expected AS (
    SELECT
      (SELECT COUNT(*) FROM public.matches WHERE stage = 'group')::int AS group_expected,
      (SELECT COUNT(*) FROM public.matches WHERE stage <> 'group')::int AS knockout_expected,
      3::int AS specials_expected
  ),
  loaded AS (
    SELECT user_id, COUNT(*)::int AS group_loaded, 0::int AS knockout_loaded, 0::int AS specials_loaded
    FROM public.predictions
    GROUP BY user_id
    UNION ALL
    SELECT user_id, 0::int, COUNT(*)::int, 0::int
    FROM public.virtual_knockout_predictions
    GROUP BY user_id
    UNION ALL
    SELECT
      user_id,
      0::int,
      0::int,
      ((balon IS NOT NULL AND TRIM(balon) <> '')::int
        + (bota IS NOT NULL AND TRIM(bota) <> '')::int
        + (guante IS NOT NULL AND TRIM(guante) <> '')::int)::int
    FROM public.special_bets
  ),
  progress AS (
    SELECT
      participants.user_id,
      COALESCE(SUM(loaded.group_loaded), 0)::int AS group_loaded,
      COALESCE(SUM(loaded.knockout_loaded), 0)::int AS knockout_loaded,
      COALESCE(SUM(loaded.specials_loaded), 0)::int AS specials_loaded,
      expected.group_expected,
      expected.knockout_expected,
      expected.specials_expected
    FROM participants
    CROSS JOIN expected
    LEFT JOIN loaded ON loaded.user_id = participants.user_id
    GROUP BY participants.user_id, expected.group_expected, expected.knockout_expected, expected.specials_expected
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
            ORDER BY total_points DESC, exact_predictions DESC, correct_result_predictions DESC, incorrect_predictions ASC
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

REVOKE ALL ON FUNCTION public.get_public_ranking() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_ranking() TO anon, authenticated;
