-- Keep the public RPC surface unambiguous for PostgREST and make the batch
-- function perform the write directly. This avoids calling an overloaded
-- save_prediction() helper from inside save_predictions().

ALTER TABLE public.predictions
ADD COLUMN IF NOT EXISTS tiebreaker_team text;

DROP FUNCTION IF EXISTS public.save_prediction(uuid, int, int, text);

CREATE OR REPLACE FUNCTION public.save_prediction(
  p_match_id uuid,
  p_home_score int,
  p_away_score int
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  IF p_home_score IS NULL
     OR p_away_score IS NULL
     OR p_home_score < 0
     OR p_away_score < 0
     OR p_home_score > 99
     OR p_away_score > 99 THEN
    RAISE EXCEPTION 'Resultado invalido';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.matches
    WHERE id = p_match_id
      AND status = 'upcoming'
      AND now() < locked_at
  ) THEN
    RAISE EXCEPTION 'Las predicciones para este partido ya cerraron';
  END IF;

  INSERT INTO public.predictions (user_id, match_id, home_score, away_score, tiebreaker_team, points)
  VALUES (v_user_id, p_match_id, p_home_score, p_away_score, NULL, NULL)
  ON CONFLICT (user_id, match_id) DO UPDATE
  SET
    home_score = excluded.home_score,
    away_score = excluded.away_score,
    tiebreaker_team = NULL,
    points = NULL,
    updated_at = now();
END;
$$;

CREATE OR REPLACE FUNCTION public.save_predictions(p_predictions jsonb)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  item record;
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

    IF NOT EXISTS (
      SELECT 1
      FROM public.matches
      WHERE id = item.match_id
        AND status = 'upcoming'
        AND now() < locked_at
    ) THEN
      RAISE EXCEPTION 'Las predicciones para este partido ya cerraron: %', item.match_id;
    END IF;

    INSERT INTO public.predictions (user_id, match_id, home_score, away_score, tiebreaker_team, points)
    VALUES (v_user_id, item.match_id, item.home_score, item.away_score, item.tiebreaker_team, NULL)
    ON CONFLICT (user_id, match_id) DO UPDATE
    SET
      home_score = excluded.home_score,
      away_score = excluded.away_score,
      tiebreaker_team = excluded.tiebreaker_team,
      points = NULL,
      updated_at = now();

    saved_count := saved_count + 1;
  END LOOP;

  RETURN saved_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.save_prediction(uuid, int, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_predictions(jsonb) TO authenticated;
