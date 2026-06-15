-- Allow completing specific missing fields after the global Prode lock without
-- reopening full edits. INSERT remains closed-only for open Prode sessions.

CREATE OR REPLACE FUNCTION public.prode_closed_completion_error()
RETURNS text
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT 'El prode ya esta cerrado. Solo podes completar datos faltantes, no modificar pronosticos ya cargados.';
$$;

CREATE OR REPLACE FUNCTION public.guard_closed_prediction_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF public.prode_submission_is_open() OR public.current_user_is_admin() THEN
    RETURN NEW;
  END IF;

  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.match_id IS DISTINCT FROM OLD.match_id
     OR NEW.home_score IS DISTINCT FROM OLD.home_score
     OR NEW.away_score IS DISTINCT FROM OLD.away_score
     OR NEW.points IS DISTINCT FROM OLD.points
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION '%', public.prode_closed_completion_error();
  END IF;

  IF OLD.tiebreaker_team IS NOT NULL
     AND NEW.tiebreaker_team IS DISTINCT FROM OLD.tiebreaker_team THEN
    RAISE EXCEPTION '%', public.prode_closed_completion_error();
  END IF;

  IF OLD.tiebreaker_team IS NULL
     AND NEW.tiebreaker_team IS NOT NULL
     AND (OLD.home_score IS DISTINCT FROM OLD.away_score OR length(trim(NEW.tiebreaker_team)) = 0) THEN
    RAISE EXCEPTION '%', public.prode_closed_completion_error();
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_closed_prediction_completion ON public.predictions;
CREATE TRIGGER trg_guard_closed_prediction_completion
BEFORE UPDATE ON public.predictions
FOR EACH ROW EXECUTE FUNCTION public.guard_closed_prediction_completion();

CREATE OR REPLACE FUNCTION public.guard_closed_virtual_prediction_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF public.prode_submission_is_open() OR public.current_user_is_admin() THEN
    RETURN NEW;
  END IF;

  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.virtual_match_id IS DISTINCT FROM OLD.virtual_match_id
     OR NEW.home_score IS DISTINCT FROM OLD.home_score
     OR NEW.away_score IS DISTINCT FROM OLD.away_score
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION '%', public.prode_closed_completion_error();
  END IF;

  IF OLD.tiebreaker_team IS NOT NULL
     AND NEW.tiebreaker_team IS DISTINCT FROM OLD.tiebreaker_team THEN
    RAISE EXCEPTION '%', public.prode_closed_completion_error();
  END IF;

  IF OLD.tiebreaker_team IS NULL
     AND NEW.tiebreaker_team IS NOT NULL
     AND (OLD.home_score IS DISTINCT FROM OLD.away_score OR length(trim(NEW.tiebreaker_team)) = 0) THEN
    RAISE EXCEPTION '%', public.prode_closed_completion_error();
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_closed_virtual_prediction_completion ON public.virtual_knockout_predictions;
CREATE TRIGGER trg_guard_closed_virtual_prediction_completion
BEFORE UPDATE ON public.virtual_knockout_predictions
FOR EACH ROW EXECUTE FUNCTION public.guard_closed_virtual_prediction_completion();

CREATE OR REPLACE FUNCTION public.guard_closed_special_bets_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF public.prode_submission_is_open() OR public.current_user_is_admin() THEN
    RETURN NEW;
  END IF;

  IF NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.points IS DISTINCT FROM OLD.points
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION '%', public.prode_closed_completion_error();
  END IF;

  IF OLD.balon IS NOT NULL AND NEW.balon IS DISTINCT FROM OLD.balon THEN
    RAISE EXCEPTION '%', public.prode_closed_completion_error();
  END IF;

  IF OLD.balon IS NULL AND NEW.balon IS NOT NULL AND length(trim(NEW.balon)) = 0 THEN
    RAISE EXCEPTION '%', public.prode_closed_completion_error();
  END IF;

  IF OLD.bota IS NOT NULL AND NEW.bota IS DISTINCT FROM OLD.bota THEN
    RAISE EXCEPTION '%', public.prode_closed_completion_error();
  END IF;

  IF OLD.bota IS NULL AND NEW.bota IS NOT NULL AND length(trim(NEW.bota)) = 0 THEN
    RAISE EXCEPTION '%', public.prode_closed_completion_error();
  END IF;

  IF OLD.guante IS NOT NULL AND NEW.guante IS DISTINCT FROM OLD.guante THEN
    RAISE EXCEPTION '%', public.prode_closed_completion_error();
  END IF;

  IF OLD.guante IS NULL AND NEW.guante IS NOT NULL AND length(trim(NEW.guante)) = 0 THEN
    RAISE EXCEPTION '%', public.prode_closed_completion_error();
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_closed_special_bets_completion ON public.special_bets;
CREATE TRIGGER trg_guard_closed_special_bets_completion
BEFORE UPDATE ON public.special_bets
FOR EACH ROW EXECUTE FUNCTION public.guard_closed_special_bets_completion();

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
        RAISE EXCEPTION '%', public.prode_closed_completion_error();
      END IF;

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

    saved_count := saved_count + 1;
  END LOOP;

  RETURN saved_count;
END;
$$;

DROP POLICY IF EXISTS predictions_update_own_open_match ON public.predictions;
DROP POLICY IF EXISTS predictions_update_own ON public.predictions;
CREATE POLICY predictions_update_own_open_match
  ON public.predictions FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_id
    AND (
      NOT public.prode_submission_is_open()
      OR EXISTS (
        SELECT 1
        FROM public.matches m
        WHERE m.id = match_id
          AND m.status = 'upcoming'
      )
    )
  )
  WITH CHECK (
    auth.uid() = user_id
    AND (
      NOT public.prode_submission_is_open()
      OR EXISTS (
        SELECT 1
        FROM public.matches m
        WHERE m.id = match_id
          AND m.status = 'upcoming'
      )
    )
  );

DROP POLICY IF EXISTS virtual_knockout_predictions_update_own ON public.virtual_knockout_predictions;
CREATE POLICY virtual_knockout_predictions_update_own
  ON public.virtual_knockout_predictions FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS special_bets_update_own ON public.special_bets;
CREATE POLICY special_bets_update_own
  ON public.special_bets FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

GRANT EXECUTE ON FUNCTION public.prode_closed_completion_error() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_predictions(jsonb) TO authenticated;
