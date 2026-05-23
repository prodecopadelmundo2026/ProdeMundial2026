-- =============================================================
-- Fix: calcular puntos automáticamente al insertar/actualizar
--      una predicción si el partido ya tiene resultado cargado.
--
-- Problema: el trigger trg_match_result_points solo corre cuando
-- se actualiza matches.home_score / away_score. Si la predicción
-- se guarda DESPUÉS de que el resultado ya existe (ej: admin usa
-- "completar aleatorio" sobre partidos ya finalizados), el campo
-- points queda NULL y la vista ranking_entries no los cuenta.
-- =============================================================

CREATE OR REPLACE FUNCTION auto_score_prediction()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v_home int;
  v_away int;
BEGIN
  -- Si el partido ya tiene resultado, calcular puntos ahora mismo
  SELECT home_score, away_score
    INTO v_home, v_away
    FROM public.matches
   WHERE id = NEW.match_id
     AND home_score IS NOT NULL
     AND away_score IS NOT NULL;

  IF FOUND THEN
    NEW.points := calculate_prediction_points(
      NEW.home_score, NEW.away_score,
      v_home, v_away
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Corre BEFORE INSERT OR UPDATE para poder modificar NEW.points
CREATE TRIGGER trg_auto_score_prediction
BEFORE INSERT OR UPDATE OF home_score, away_score
ON public.predictions
FOR EACH ROW EXECUTE FUNCTION auto_score_prediction();
