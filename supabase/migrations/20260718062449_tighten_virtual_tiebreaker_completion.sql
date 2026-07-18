-- Tighten late completion for virtual knockout tiebreakers.
-- Missing tiebreaker_team can only be completed while the virtual slot is still open.

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
     AND NEW.tiebreaker_team IS NOT NULL THEN
    IF OLD.home_score IS DISTINCT FROM OLD.away_score
       OR length(trim(NEW.tiebreaker_team)) = 0
       OR NOT public.virtual_knockout_prediction_is_open(OLD.virtual_match_id) THEN
      RAISE EXCEPTION '%', public.prode_closed_completion_error();
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
