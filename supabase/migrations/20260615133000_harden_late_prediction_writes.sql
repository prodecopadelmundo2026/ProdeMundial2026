-- Harden per-match prediction writes. A prediction can only be created or
-- edited while the match is still upcoming and has not reached scheduled_at.

CREATE OR REPLACE FUNCTION public.prediction_match_is_open(p_match_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.matches m
    WHERE m.id = p_match_id
      AND m.status = 'upcoming'
      AND m.scheduled_at > now()
  );
$$;

CREATE OR REPLACE FUNCTION public.late_prediction_write_error()
RETURNS text
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT 'No podés cargar pronósticos de partidos que ya empezaron o finalizaron.';
$$;

CREATE OR REPLACE FUNCTION public.guard_prediction_match_open()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NOT public.prediction_match_is_open(NEW.match_id) THEN
      RAISE EXCEPTION '%', public.late_prediction_write_error();
    END IF;

    RETURN NEW;
  END IF;

  IF NOT public.prediction_match_is_open(COALESCE(NEW.match_id, OLD.match_id))
     AND (
       NEW.id IS DISTINCT FROM OLD.id
       OR NEW.user_id IS DISTINCT FROM OLD.user_id
       OR NEW.match_id IS DISTINCT FROM OLD.match_id
       OR NEW.home_score IS DISTINCT FROM OLD.home_score
       OR NEW.away_score IS DISTINCT FROM OLD.away_score
       OR NEW.tiebreaker_team IS DISTINCT FROM OLD.tiebreaker_team
       OR NEW.created_at IS DISTINCT FROM OLD.created_at
     ) THEN
    RAISE EXCEPTION '%', public.late_prediction_write_error();
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_prediction_match_open ON public.predictions;
CREATE TRIGGER trg_guard_prediction_match_open
BEFORE INSERT OR UPDATE ON public.predictions
FOR EACH ROW EXECUTE FUNCTION public.guard_prediction_match_open();

CREATE OR REPLACE FUNCTION public.save_prediction(
  p_match_id uuid,
  p_home_score int,
  p_away_score int
) RETURNS void
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

  IF NOT public.prediction_match_is_open(p_match_id) THEN
    RAISE EXCEPTION '%', public.late_prediction_write_error();
  END IF;

  INSERT INTO public.predictions (user_id, match_id, home_score, away_score, points)
  VALUES (v_user_id, p_match_id, p_home_score, p_away_score, NULL)
  ON CONFLICT (user_id, match_id) DO UPDATE
  SET
    home_score = excluded.home_score,
    away_score = excluded.away_score,
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

    IF NOT public.prediction_match_is_open(item.match_id) THEN
      RAISE EXCEPTION '%', public.late_prediction_write_error();
    END IF;

    IF NOT v_is_open AND NULLIF(trim(coalesce(item.tiebreaker_team, '')), '') IS NOT NULL
       AND item.home_score IS DISTINCT FROM item.away_score THEN
      RAISE EXCEPTION '%', public.prode_closed_completion_error();
    END IF;

    IF v_is_open THEN
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

DROP POLICY IF EXISTS predictions_insert_own_open_match ON public.predictions;
DROP POLICY IF EXISTS predictions_insert_own ON public.predictions;
CREATE POLICY predictions_insert_own_open_match
  ON public.predictions FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND points IS NULL
    AND public.prediction_match_is_open(match_id)
  );

DROP POLICY IF EXISTS predictions_update_own_open_match ON public.predictions;
DROP POLICY IF EXISTS predictions_update_own ON public.predictions;
CREATE POLICY predictions_update_own_open_match
  ON public.predictions FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_id
    AND public.prediction_match_is_open(match_id)
  )
  WITH CHECK (
    auth.uid() = user_id
    AND public.prediction_match_is_open(match_id)
  );

DROP POLICY IF EXISTS predictions_delete_own ON public.predictions;
CREATE POLICY predictions_delete_own
  ON public.predictions FOR DELETE
  TO authenticated
  USING (
    auth.uid() = user_id
    AND public.prediction_match_is_open(match_id)
  );

GRANT EXECUTE ON FUNCTION public.prediction_match_is_open(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.late_prediction_write_error() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_prediction(uuid, int, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_predictions(jsonb) TO authenticated;
