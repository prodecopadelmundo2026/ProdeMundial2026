BEGIN;

ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS bracket_slot int,
  ADD COLUMN IF NOT EXISTS decided_by text,
  ADD COLUMN IF NOT EXISTS qualified_team text;

ALTER TABLE public.matches
  DROP CONSTRAINT IF EXISTS matches_bracket_slot_range,
  ADD CONSTRAINT matches_bracket_slot_range
    CHECK (bracket_slot IS NULL OR bracket_slot BETWEEN 73 AND 104),
  DROP CONSTRAINT IF EXISTS matches_decided_by_valid,
  ADD CONSTRAINT matches_decided_by_valid
    CHECK (decided_by IS NULL OR decided_by IN ('regular_time', 'extra_time_or_penalties'));

CREATE UNIQUE INDEX IF NOT EXISTS matches_bracket_slot_unique_idx
  ON public.matches (bracket_slot)
  WHERE bracket_slot IS NOT NULL;

GRANT SELECT ON public.predictions TO service_role;
GRANT SELECT ON public.user_prediction_tiebreakers TO service_role;
GRANT SELECT ON public.profiles TO service_role;
GRANT SELECT ON public.virtual_knockout_predictions TO service_role;
GRANT SELECT ON public.matches TO service_role;

WITH fixture(bracket_slot, home_team, away_team, scheduled_at, stage) AS (
  VALUES
    (73, '2do Grupo A', '2do Grupo B', '2026-06-28 22:00:00+00'::timestamptz, 'round_of_32'),
    (74, '1ro Grupo E', '3ro Grupo A/B/C/D/F', '2026-06-29 20:30:00+00'::timestamptz, 'round_of_32'),
    (75, '1ro Grupo F', '2do Grupo C', '2026-06-30 03:00:00+00'::timestamptz, 'round_of_32'),
    (76, '1ro Grupo C', '2do Grupo F', '2026-06-29 18:00:00+00'::timestamptz, 'round_of_32'),
    (77, '1ro Grupo I', '3ro Grupo C/D/F/G/H', '2026-06-30 21:00:00+00'::timestamptz, 'round_of_32'),
    (78, '2do Grupo E', '2do Grupo I', '2026-06-30 18:00:00+00'::timestamptz, 'round_of_32'),
    (79, '1ro Grupo A', '3ro Grupo C/E/F/H/I', '2026-07-01 03:00:00+00'::timestamptz, 'round_of_32'),
    (80, '1ro Grupo L', '3ro Grupo E/H/I/J/K', '2026-07-01 16:00:00+00'::timestamptz, 'round_of_32'),
    (81, '1ro Grupo D', '3ro Grupo B/E/F/I/J', '2026-07-02 03:00:00+00'::timestamptz, 'round_of_32'),
    (82, '1ro Grupo G', '3ro Grupo A/E/H/I/J', '2026-07-01 23:00:00+00'::timestamptz, 'round_of_32'),
    (83, '2do Grupo K', '2do Grupo L', '2026-07-02 23:00:00+00'::timestamptz, 'round_of_32'),
    (84, '1ro Grupo H', '2do Grupo J', '2026-07-02 22:00:00+00'::timestamptz, 'round_of_32'),
    (85, '1ro Grupo B', '3ro Grupo E/F/G/I/J', '2026-07-03 06:00:00+00'::timestamptz, 'round_of_32'),
    (86, '1ro Grupo J', '2do Grupo H', '2026-07-03 22:00:00+00'::timestamptz, 'round_of_32'),
    (87, '1ro Grupo K', '3ro Grupo D/E/I/J/L', '2026-07-04 02:30:00+00'::timestamptz, 'round_of_32'),
    (88, '2do Grupo D', '2do Grupo G', '2026-07-03 19:00:00+00'::timestamptz, 'round_of_32'),
    (89, 'Ganador P74', 'Ganador P77', '2026-07-04 21:00:00+00'::timestamptz, 'round_of_16'),
    (90, 'Ganador P73', 'Ganador P75', '2026-07-04 18:00:00+00'::timestamptz, 'round_of_16'),
    (91, 'Ganador P76', 'Ganador P78', '2026-07-05 20:00:00+00'::timestamptz, 'round_of_16'),
    (92, 'Ganador P79', 'Ganador P80', '2026-07-06 02:00:00+00'::timestamptz, 'round_of_16'),
    (93, 'Ganador P83', 'Ganador P84', '2026-07-06 20:00:00+00'::timestamptz, 'round_of_16'),
    (94, 'Ganador P81', 'Ganador P82', '2026-07-07 03:00:00+00'::timestamptz, 'round_of_16'),
    (95, 'Ganador P86', 'Ganador P88', '2026-07-07 16:00:00+00'::timestamptz, 'round_of_16'),
    (96, 'Ganador P85', 'Ganador P87', '2026-07-07 23:00:00+00'::timestamptz, 'round_of_16'),
    (97, 'Ganador P89', 'Ganador P90', '2026-07-09 20:00:00+00'::timestamptz, 'quarter'),
    (98, 'Ganador P93', 'Ganador P94', '2026-07-10 22:00:00+00'::timestamptz, 'quarter'),
    (99, 'Ganador P91', 'Ganador P92', '2026-07-11 21:00:00+00'::timestamptz, 'quarter'),
    (100, 'Ganador P95', 'Ganador P96', '2026-07-12 02:00:00+00'::timestamptz, 'quarter'),
    (101, 'Ganador P97', 'Ganador P98', '2026-07-14 20:00:00+00'::timestamptz, 'semi'),
    (102, 'Ganador P99', 'Ganador P100', '2026-07-15 19:00:00+00'::timestamptz, 'semi'),
    (103, 'Perdedor P101', 'Perdedor P102', '2026-07-18 21:00:00+00'::timestamptz, 'third_place'),
    (104, 'Ganador P101', 'Ganador P102', '2026-07-19 19:00:00+00'::timestamptz, 'final')
)
INSERT INTO public.matches (bracket_slot, home_team, away_team, scheduled_at, locked_at, stage, "group", status)
SELECT bracket_slot, home_team, away_team, scheduled_at, scheduled_at - interval '5 minutes', stage, NULL, 'upcoming'
FROM fixture
ON CONFLICT (bracket_slot) WHERE bracket_slot IS NOT NULL DO NOTHING;

DROP FUNCTION IF EXISTS public.admin_set_match_result(uuid, int, int, text);
DROP FUNCTION IF EXISTS public.admin_set_match_result(uuid, int, int, text, text, text);
DROP FUNCTION IF EXISTS public.admin_set_match_result(uuid, int, int, text, text, text, text, text);

CREATE FUNCTION public.admin_set_match_result(
  p_match_id uuid,
  p_home_score int,
  p_away_score int,
  p_status text,
  p_decided_by text DEFAULT 'regular_time',
  p_qualified_team text DEFAULT NULL,
  p_home_team text DEFAULT NULL,
  p_away_team text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $fn$
DECLARE
  v_match public.matches%ROWTYPE;
  v_qualified_team text := NULLIF(TRIM(p_qualified_team), '');
  v_home_team text;
  v_away_team text;
  v_expected_qualified_team text;
BEGIN
  IF NOT public.current_user_is_admin() THEN
    RAISE EXCEPTION 'Sin permisos de administrador';
  END IF;

  SELECT * INTO v_match FROM public.matches WHERE id = p_match_id;
  IF NOT FOUND THEN
    RETURN false;
  END IF;

  v_home_team := COALESCE(NULLIF(TRIM(p_home_team), ''), v_match.home_team);
  v_away_team := COALESCE(NULLIF(TRIM(p_away_team), ''), v_match.away_team);

  IF p_status NOT IN ('upcoming', 'live', 'finished') THEN
    RAISE EXCEPTION 'Estado de partido invalido';
  END IF;

  IF p_decided_by NOT IN ('regular_time', 'extra_time_or_penalties') THEN
    RAISE EXCEPTION 'Tipo de definicion invalido';
  END IF;

  IF ((p_home_score IS NOT NULL AND (p_home_score < 0 OR p_home_score > 99)) OR (p_away_score IS NOT NULL AND (p_away_score < 0 OR p_away_score > 99))) THEN
    RAISE EXCEPTION 'Goles invalidos';
  END IF;

  IF p_status IN ('live', 'finished') AND (p_home_score IS NULL OR p_away_score IS NULL) THEN
    RAISE EXCEPTION 'El partido requiere el marcador de los 90 minutos';
  END IF;

  IF v_match.stage <> 'group' AND p_status = 'finished' THEN
    IF p_decided_by = 'regular_time' THEN
      IF p_home_score = p_away_score THEN
        RAISE EXCEPTION 'Un partido finalizado en 90 minutos no puede terminar empatado';
      END IF;

      v_expected_qualified_team := CASE WHEN p_home_score > p_away_score THEN v_home_team ELSE v_away_team END;

      IF v_qualified_team IS NULL THEN
        v_qualified_team := v_expected_qualified_team;
      END IF;

      IF v_qualified_team <> v_expected_qualified_team THEN
        RAISE EXCEPTION 'El clasificado debe ser el ganador de los 90 minutos';
      END IF;
    ELSE
      IF p_home_score <> p_away_score THEN
        RAISE EXCEPTION 'Si se definio en tiempo extra o penales, el marcador de los 90 minutos debe ser empate';
      END IF;
    END IF;

    IF v_qualified_team IS NULL THEN
      RAISE EXCEPTION 'Selecciona el equipo clasificado';
    END IF;

    IF v_qualified_team NOT IN (v_home_team, v_away_team) THEN
      RAISE EXCEPTION 'El clasificado debe ser uno de los equipos del partido';
    END IF;
  END IF;

  UPDATE public.matches
  SET home_team = v_home_team,
      away_team = v_away_team,
      home_score = CASE WHEN p_status = 'upcoming' THEN NULL ELSE p_home_score END,
      away_score = CASE WHEN p_status = 'upcoming' THEN NULL ELSE p_away_score END,
      status = p_status,
      decided_by = CASE WHEN p_status = 'upcoming' THEN NULL ELSE p_decided_by END,
      qualified_team = CASE WHEN p_status = 'upcoming' THEN NULL ELSE v_qualified_team END
  WHERE id = p_match_id;

  RETURN FOUND;
END;
$fn$;

REVOKE ALL ON FUNCTION public.admin_set_match_result(uuid, int, int, text, text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_match_result(uuid, int, int, text, text, text, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_clear_match_result(p_match_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $fn$
BEGIN
  IF NOT public.current_user_is_admin() THEN
    RAISE EXCEPTION 'Sin permisos de administrador';
  END IF;

  UPDATE public.matches
  SET home_score = NULL,
      away_score = NULL,
      status = 'upcoming',
      decided_by = NULL,
      qualified_team = NULL
  WHERE id = p_match_id;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  UPDATE public.predictions
  SET points = NULL, updated_at = now()
  WHERE match_id = p_match_id;

  RETURN true;
END;
$fn$;

COMMIT;