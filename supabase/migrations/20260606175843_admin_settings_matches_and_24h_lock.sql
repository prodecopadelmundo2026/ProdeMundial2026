-- Admin writes must not depend on direct table permissions from the app.
-- These RPCs validate admin status and run with definer privileges.

CREATE OR REPLACE FUNCTION public.prode_first_match_at()
RETURNS timestamptz
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT '2026-06-11 19:00:00+00'::timestamptz;
$$;

CREATE OR REPLACE FUNCTION public.prode_submission_cutoff_at()
RETURNS timestamptz
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT public.prode_first_match_at() - interval '24 hours';
$$;

CREATE OR REPLACE FUNCTION public.prode_submission_is_open()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_override text;
BEGIN
  SELECT value
    INTO v_override
  FROM public.app_settings
  WHERE key = 'prode_lock_override';

  IF v_override = 'locked' THEN
    RETURN false;
  END IF;

  IF v_override = 'unlocked' THEN
    RETURN true;
  END IF;

  RETURN now() < public.prode_submission_cutoff_at();
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_maintenance_mode(p_enabled boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF NOT public.current_user_is_admin() THEN
    RAISE EXCEPTION 'Sin permisos de administrador';
  END IF;

  INSERT INTO public.app_settings (key, value, updated_at)
  VALUES ('maintenance_mode', CASE WHEN p_enabled THEN 'on' ELSE 'off' END, now())
  ON CONFLICT (key) DO UPDATE
  SET value = excluded.value,
      updated_at = now();
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_prode_lock_override(p_override text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_override text := NULLIF(trim(coalesce(p_override, '')), '');
BEGIN
  IF NOT public.current_user_is_admin() THEN
    RAISE EXCEPTION 'Sin permisos de administrador';
  END IF;

  IF v_override IS NULL OR v_override = 'auto' THEN
    DELETE FROM public.app_settings
    WHERE key = 'prode_lock_override';
    RETURN;
  END IF;

  IF v_override NOT IN ('locked', 'unlocked') THEN
    RAISE EXCEPTION 'Override invalido';
  END IF;

  INSERT INTO public.app_settings (key, value, updated_at)
  VALUES ('prode_lock_override', v_override, now())
  ON CONFLICT (key) DO UPDATE
  SET value = excluded.value,
      updated_at = now();
END;
$$;

DROP FUNCTION IF EXISTS public.admin_set_match_result(uuid, int, int, text);
CREATE FUNCTION public.admin_set_match_result(
  p_match_id uuid,
  p_home_score int,
  p_away_score int,
  p_status text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF NOT public.current_user_is_admin() THEN
    RAISE EXCEPTION 'Sin permisos de administrador';
  END IF;

  IF p_status NOT IN ('upcoming', 'live', 'finished') THEN
    RAISE EXCEPTION 'Estado de partido invalido';
  END IF;

  IF p_home_score IS NULL
     OR p_away_score IS NULL
     OR p_home_score < 0
     OR p_away_score < 0
     OR p_home_score > 99
     OR p_away_score > 99 THEN
    RAISE EXCEPTION 'Goles invalidos';
  END IF;

  UPDATE public.matches
  SET home_score = p_home_score,
      away_score = p_away_score,
      status = p_status
  WHERE id = p_match_id;

  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_reset_match_results()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_count int := 0;
BEGIN
  IF NOT public.current_user_is_admin() THEN
    RAISE EXCEPTION 'Sin permisos de administrador';
  END IF;

  UPDATE public.matches
  SET home_score = NULL,
      away_score = NULL,
      status = 'upcoming'
  WHERE stage IN ('group', 'round_of_32', 'round_of_16', 'quarter', 'semi', 'final', 'third_place');

  GET DIAGNOSTICS v_count = ROW_COUNT;

  UPDATE public.predictions
  SET points = NULL,
      updated_at = now();

  RETURN v_count;
END;
$$;

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

  IF NOT public.prode_submission_is_open() THEN
    RAISE EXCEPTION 'La carga del Prode ya cerro. Podes consultar tus pronosticos, pero ya no editarlos.';
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
  ) THEN
    RAISE EXCEPTION 'Las predicciones para este partido ya cerraron';
  END IF;

  INSERT INTO public.predictions (user_id, match_id, home_score, away_score, tiebreaker_team, points)
  VALUES (v_user_id, p_match_id, p_home_score, p_away_score, NULL, NULL)
  ON CONFLICT (user_id, match_id) DO UPDATE
  SET home_score = excluded.home_score,
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

  IF NOT public.prode_submission_is_open() THEN
    RAISE EXCEPTION 'La carga del Prode ya cerro. Podes consultar tus pronosticos, pero ya no editarlos.';
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
    AND public.prode_submission_is_open()
    AND EXISTS (
      SELECT 1
      FROM public.matches m
      WHERE m.id = match_id
        AND m.status = 'upcoming'
    )
  );

DROP POLICY IF EXISTS predictions_update_own_open_match ON public.predictions;
DROP POLICY IF EXISTS predictions_update_own ON public.predictions;
CREATE POLICY predictions_update_own_open_match
  ON public.predictions FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_id
    AND public.prode_submission_is_open()
    AND EXISTS (
      SELECT 1
      FROM public.matches m
      WHERE m.id = match_id
        AND m.status = 'upcoming'
    )
  )
  WITH CHECK (
    auth.uid() = user_id
    AND public.prode_submission_is_open()
    AND EXISTS (
      SELECT 1
      FROM public.matches m
      WHERE m.id = match_id
        AND m.status = 'upcoming'
    )
  );

DROP POLICY IF EXISTS predictions_delete_own ON public.predictions;
CREATE POLICY predictions_delete_own
  ON public.predictions FOR DELETE
  TO authenticated
  USING (
    auth.uid() = user_id
    AND public.prode_submission_is_open()
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
    AND public.prode_submission_is_open()
  );

DROP POLICY IF EXISTS virtual_knockout_predictions_update_own ON public.virtual_knockout_predictions;
CREATE POLICY virtual_knockout_predictions_update_own
  ON public.virtual_knockout_predictions FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid()
    AND public.prode_submission_is_open()
  )
  WITH CHECK (
    user_id = auth.uid()
    AND public.prode_submission_is_open()
  );

DROP POLICY IF EXISTS virtual_knockout_predictions_delete_own ON public.virtual_knockout_predictions;
CREATE POLICY virtual_knockout_predictions_delete_own
  ON public.virtual_knockout_predictions FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    AND public.prode_submission_is_open()
  );

DROP POLICY IF EXISTS user_prediction_tiebreakers_insert_own ON public.user_prediction_tiebreakers;
CREATE POLICY user_prediction_tiebreakers_insert_own
  ON public.user_prediction_tiebreakers FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND public.prode_submission_is_open()
  );

DROP POLICY IF EXISTS user_prediction_tiebreakers_update_own ON public.user_prediction_tiebreakers;
CREATE POLICY user_prediction_tiebreakers_update_own
  ON public.user_prediction_tiebreakers FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid()
    AND public.prode_submission_is_open()
  )
  WITH CHECK (
    user_id = auth.uid()
    AND public.prode_submission_is_open()
  );

DROP POLICY IF EXISTS user_prediction_tiebreakers_delete_own ON public.user_prediction_tiebreakers;
CREATE POLICY user_prediction_tiebreakers_delete_own
  ON public.user_prediction_tiebreakers FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    AND public.prode_submission_is_open()
  );

DROP POLICY IF EXISTS special_bets_insert_own ON public.special_bets;
CREATE POLICY special_bets_insert_own
  ON public.special_bets FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND public.prode_submission_is_open()
  );

DROP POLICY IF EXISTS special_bets_update_own ON public.special_bets;
CREATE POLICY special_bets_update_own
  ON public.special_bets FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid()
    AND public.prode_submission_is_open()
  )
  WITH CHECK (
    user_id = auth.uid()
    AND public.prode_submission_is_open()
  );

DROP POLICY IF EXISTS special_bets_delete_own ON public.special_bets;
CREATE POLICY special_bets_delete_own
  ON public.special_bets FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    AND public.prode_submission_is_open()
  );

REVOKE EXECUTE ON FUNCTION public.admin_set_maintenance_mode(boolean) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_set_prode_lock_override(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_set_match_result(uuid, int, int, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_reset_match_results() FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.prode_first_match_at() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.prode_submission_cutoff_at() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.prode_submission_is_open() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_maintenance_mode(boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_prode_lock_override(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_match_result(uuid, int, int, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reset_match_results() TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_prediction(uuid, int, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_predictions(jsonb) TO authenticated;
