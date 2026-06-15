-- Allow admins to correct official match state safely.
-- Upcoming matches may have NULL scores, live matches may carry a temporary
-- score without scoring, and only finished matches score predictions.

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

  IF p_home_score IS NOT NULL AND (p_home_score < 0 OR p_home_score > 99) THEN
    RAISE EXCEPTION 'Goles invalidos';
  END IF;

  IF p_away_score IS NOT NULL AND (p_away_score < 0 OR p_away_score > 99) THEN
    RAISE EXCEPTION 'Goles invalidos';
  END IF;

  IF p_status = 'finished' AND (p_home_score IS NULL OR p_away_score IS NULL) THEN
    RAISE EXCEPTION 'Los partidos finalizados requieren ambos goles';
  END IF;

  IF p_status = 'live' AND (p_home_score IS NULL OR p_away_score IS NULL) THEN
    RAISE EXCEPTION 'Los partidos en vivo requieren ambos goles';
  END IF;

  IF p_status = 'upcoming' THEN
    UPDATE public.matches
    SET home_score = NULL,
        away_score = NULL,
        status = 'upcoming'
    WHERE id = p_match_id;
  ELSE
    UPDATE public.matches
    SET home_score = p_home_score,
        away_score = p_away_score,
        status = p_status
    WHERE id = p_match_id;
  END IF;

  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.auto_score_prediction()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_home int;
  v_away int;
BEGIN
  SELECT home_score, away_score
    INTO v_home, v_away
    FROM public.matches
   WHERE id = NEW.match_id
     AND status = 'finished'
     AND home_score IS NOT NULL
     AND away_score IS NOT NULL;

  IF FOUND THEN
    NEW.points := public.calculate_prediction_points(
      NEW.home_score, NEW.away_score,
      v_home, v_away
    );
  ELSE
    NEW.points := NULL;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_clear_match_result(p_match_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF NOT public.current_user_is_admin() THEN
    RAISE EXCEPTION 'Sin permisos de administrador';
  END IF;

  UPDATE public.matches
  SET home_score = NULL,
      away_score = NULL,
      status = 'upcoming'
  WHERE id = p_match_id;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  UPDATE public.predictions
  SET points = NULL,
      updated_at = now()
  WHERE match_id = p_match_id;

  RETURN true;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_set_match_result(uuid, int, int, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_match_result(uuid, int, int, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.admin_clear_match_result(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_clear_match_result(uuid) TO authenticated;
