-- Allow users to create their own missing Prode records after lock while keeping
-- existing values immutable through the guards created in the previous migration.

CREATE OR REPLACE FUNCTION public.save_predictions(p_predictions jsonb)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  item record;
  v_existing record;
  v_is_open boolean := public.prode_submission_is_open();
  v_user_id uuid := auth.uid();
  saved_count int := 0;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  IF p_predictions IS NULL OR jsonb_typeof(p_predictions) <> 'array' THEN
    RAISE EXCEPTION 'Formato invalido';
  END IF;

  FOR item IN
    SELECT *
    FROM jsonb_to_recordset(p_predictions)
      AS x(match_id uuid, home_score int, away_score int, tiebreaker_team text)
  LOOP
    IF item.match_id IS NULL
       OR item.home_score IS NULL
       OR item.away_score IS NULL
       OR item.home_score < 0
       OR item.away_score < 0
       OR item.home_score > 99
       OR item.away_score > 99 THEN
      RAISE EXCEPTION 'Resultado invalido';
    END IF;

    IF NOT v_is_open AND NULLIF(trim(coalesce(item.tiebreaker_team, '')), '') IS NOT NULL
       AND item.home_score IS DISTINCT FROM item.away_score THEN
      RAISE EXCEPTION '%', public.prode_closed_completion_error();
    END IF;

    IF v_is_open THEN
      IF NOT EXISTS (
        SELECT 1
        FROM public.matches
        WHERE id = item.match_id
          AND status = 'upcoming'
      ) THEN
        RAISE EXCEPTION 'Las predicciones para este partido ya cerraron: %', item.match_id;
      END IF;

      INSERT INTO public.predictions (user_id, match_id, home_score, away_score, tiebreaker_team, points)
      VALUES (v_user_id, item.match_id, item.home_score, item.away_score, item.tiebreaker_team, NULL)
      ON CONFLICT (user_id, match_id) DO UPDATE
      SET home_score = excluded.home_score,
          away_score = excluded.away_score,
          tiebreaker_team = excluded.tiebreaker_team,
          points = NULL,
          updated_at = now();
    ELSE
      SELECT p.home_score, p.away_score, p.tiebreaker_team
        INTO v_existing
      FROM public.predictions p
      WHERE p.user_id = v_user_id
        AND p.match_id = item.match_id;

      IF NOT FOUND THEN
        IF NOT EXISTS (
          SELECT 1
          FROM public.matches
          WHERE id = item.match_id
            AND status = 'upcoming'
        ) THEN
          RAISE EXCEPTION '%', public.prode_closed_completion_error();
        END IF;

        INSERT INTO public.predictions (user_id, match_id, home_score, away_score, tiebreaker_team, points)
        VALUES (
          v_user_id,
          item.match_id,
          item.home_score,
          item.away_score,
          NULLIF(trim(coalesce(item.tiebreaker_team, '')), ''),
          NULL
        );
      ELSE
        IF v_existing.home_score IS DISTINCT FROM item.home_score
           OR v_existing.away_score IS DISTINCT FROM item.away_score THEN
          RAISE EXCEPTION '%', public.prode_closed_completion_error();
        END IF;

        IF v_existing.tiebreaker_team IS NULL THEN
          IF NULLIF(trim(coalesce(item.tiebreaker_team, '')), '') IS NOT NULL THEN
            IF v_existing.home_score IS DISTINCT FROM v_existing.away_score THEN
              RAISE EXCEPTION '%', public.prode_closed_completion_error();
            END IF;

            UPDATE public.predictions
            SET tiebreaker_team = NULLIF(trim(item.tiebreaker_team), ''),
                updated_at = now()
            WHERE user_id = v_user_id
              AND match_id = item.match_id;
          END IF;
        ELSIF v_existing.tiebreaker_team IS DISTINCT FROM item.tiebreaker_team THEN
          RAISE EXCEPTION '%', public.prode_closed_completion_error();
        END IF;
      END IF;
    END IF;

    saved_count := saved_count + 1;
  END LOOP;

  RETURN saved_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.virtual_knockout_prediction_is_open(p_virtual_match_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH requested AS (
    SELECT substring(p_virtual_match_id from '^virtual-p([0-9]+)$')::int AS p_num
  ),
  fixtures(p_num, home_team, away_team, scheduled_at) AS (
    VALUES
      (73,  '2° Grupo A',  '2° Grupo B',  '2026-06-28T22:00:00.000Z'::timestamptz),
      (74,  '1° Grupo E',  '3° Grupo A/B/C/D/F',  '2026-06-29T20:30:00.000Z'::timestamptz),
      (75,  '1° Grupo F',  '2° Grupo C',  '2026-06-30T03:00:00.000Z'::timestamptz),
      (76,  '1° Grupo C',  '2° Grupo F',  '2026-06-29T18:00:00.000Z'::timestamptz),
      (77,  '1° Grupo I',  '3° Grupo C/D/F/G/H',  '2026-06-30T21:00:00.000Z'::timestamptz),
      (78,  '2° Grupo E',  '2° Grupo I',  '2026-06-30T18:00:00.000Z'::timestamptz),
      (79,  '1° Grupo A',  '3° Grupo C/E/F/H/I',  '2026-07-01T03:00:00.000Z'::timestamptz),
      (80,  '1° Grupo L',  '3° Grupo E/H/I/J/K',  '2026-07-01T16:00:00.000Z'::timestamptz),
      (81,  '1° Grupo D',  '3° Grupo B/E/F/I/J',  '2026-07-02T03:00:00.000Z'::timestamptz),
      (82,  '1° Grupo G',  '3° Grupo A/E/H/I/J',  '2026-07-01T23:00:00.000Z'::timestamptz),
      (83,  '2° Grupo K',  '2° Grupo L',  '2026-07-02T23:00:00.000Z'::timestamptz),
      (84,  '1° Grupo H',  '2° Grupo J',  '2026-07-02T22:00:00.000Z'::timestamptz),
      (85,  '1° Grupo B',  '3° Grupo E/F/G/I/J',  '2026-07-03T06:00:00.000Z'::timestamptz),
      (86,  '1° Grupo J',  '2° Grupo H',  '2026-07-03T22:00:00.000Z'::timestamptz),
      (87,  '1° Grupo K',  '3° Grupo D/E/I/J/L',  '2026-07-04T02:30:00.000Z'::timestamptz),
      (88,  '2° Grupo D',  '2° Grupo G',  '2026-07-03T19:00:00.000Z'::timestamptz),
      (89,  'Ganador P74', 'Ganador P77', '2026-07-04T21:00:00.000Z'::timestamptz),
      (90,  'Ganador P73', 'Ganador P75', '2026-07-04T18:00:00.000Z'::timestamptz),
      (91,  'Ganador P76', 'Ganador P78', '2026-07-05T20:00:00.000Z'::timestamptz),
      (92,  'Ganador P79', 'Ganador P80', '2026-07-06T02:00:00.000Z'::timestamptz),
      (93,  'Ganador P83', 'Ganador P84', '2026-07-06T20:00:00.000Z'::timestamptz),
      (94,  'Ganador P81', 'Ganador P82', '2026-07-07T03:00:00.000Z'::timestamptz),
      (95,  'Ganador P86', 'Ganador P88', '2026-07-07T16:00:00.000Z'::timestamptz),
      (96,  'Ganador P85', 'Ganador P87', '2026-07-07T23:00:00.000Z'::timestamptz),
      (97,  'Ganador P89', 'Ganador P90', '2026-07-09T20:00:00.000Z'::timestamptz),
      (98,  'Ganador P93', 'Ganador P94', '2026-07-10T22:00:00.000Z'::timestamptz),
      (99,  'Ganador P91', 'Ganador P92', '2026-07-11T21:00:00.000Z'::timestamptz),
      (100, 'Ganador P95', 'Ganador P96', '2026-07-12T02:00:00.000Z'::timestamptz),
      (101, 'Ganador P97', 'Ganador P98', '2026-07-14T20:00:00.000Z'::timestamptz),
      (102, 'Ganador P99', 'Ganador P100', '2026-07-15T19:00:00.000Z'::timestamptz),
      (103, 'Perdedor P101', 'Perdedor P102', '2026-07-18T22:00:00.000Z'::timestamptz),
      (104, 'Ganador P101', 'Ganador P102', '2026-07-19T19:00:00.000Z'::timestamptz)
  ),
  fixture AS (
    SELECT f.*
    FROM fixtures f
    JOIN requested r ON r.p_num = f.p_num
  ),
  db_match AS (
    SELECT m.status, m.locked_at, m.scheduled_at
    FROM public.matches m
    JOIN fixture f
      ON f.home_team = m.home_team
     AND f.away_team = m.away_team
    ORDER BY m.scheduled_at
    LIMIT 1
  )
  SELECT coalesce(
    (SELECT status = 'upcoming' AND now() < coalesce(locked_at, scheduled_at) FROM db_match),
    (SELECT now() < scheduled_at FROM fixture),
    false
  );
$$;

DROP POLICY IF EXISTS predictions_insert_own_open_match ON public.predictions;
DROP POLICY IF EXISTS predictions_insert_own ON public.predictions;
CREATE POLICY predictions_insert_own_open_match
  ON public.predictions FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND points IS NULL
    AND EXISTS (
      SELECT 1
      FROM public.matches m
      WHERE m.id = match_id
        AND m.status = 'upcoming'
    )
  );

DROP POLICY IF EXISTS virtual_knockout_predictions_insert_own ON public.virtual_knockout_predictions;
CREATE POLICY virtual_knockout_predictions_insert_own
  ON public.virtual_knockout_predictions FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND public.virtual_knockout_prediction_is_open(virtual_match_id)
  );

DROP POLICY IF EXISTS special_bets_insert_own ON public.special_bets;
CREATE POLICY special_bets_insert_own
  ON public.special_bets FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND points IS NULL
  );

GRANT EXECUTE ON FUNCTION public.save_predictions(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.virtual_knockout_prediction_is_open(text) TO authenticated;
