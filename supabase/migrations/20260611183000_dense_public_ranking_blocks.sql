-- Visual ranking por bloques:
-- #1 para el mejor bloque empatado, #2 para el siguiente bloque distinto, etc.
-- El nombre queda solo como orden visual final, no como desempate de posicion.

DO $$
DECLARE
  fn text;
  old_shared_expr text := 'rank() OVER (
            PARTITION BY participant_status
            ORDER BY total_points DESC, exact_predictions DESC, correct_result_predictions DESC, incorrect_predictions ASC
          )::int';
  old_name_expr text := 'rank() OVER (
            PARTITION BY participant_status
            ORDER BY total_points DESC, exact_predictions DESC, correct_result_predictions DESC, name ASC
          )::int';
  new_expr text := 'dense_rank() OVER (
            PARTITION BY participant_status
            ORDER BY total_points DESC, exact_predictions DESC, correct_result_predictions DESC, incorrect_predictions ASC
          )::int';
BEGIN
  SELECT pg_get_functiondef('public.get_public_ranking()'::regprocedure)
    INTO fn;

  IF fn IS NULL THEN
    RAISE EXCEPTION 'No se encontro public.get_public_ranking() para aplicar dense_rank.';
  END IF;

  IF position(old_shared_expr IN fn) > 0 THEN
    EXECUTE replace(fn, old_shared_expr, new_expr);
  ELSIF position(old_name_expr IN fn) > 0 THEN
    EXECUTE replace(fn, old_name_expr, new_expr);
  ELSE
    RAISE EXCEPTION 'No se encontro la definicion esperada de public.get_public_ranking() para aplicar dense_rank.';
  END IF;
END $$;
