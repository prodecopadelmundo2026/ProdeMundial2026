-- =============================================================
-- Hardening MVP: Google + codigo, RLS estricto y RPCs seguras
-- =============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- -------------------------------------------------------------
-- Columnas/tablas nuevas
-- -------------------------------------------------------------

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false;

ALTER TABLE public.matches
  ADD CONSTRAINT matches_home_score_range
  CHECK (home_score IS NULL OR home_score BETWEEN 0 AND 30) NOT VALID;

ALTER TABLE public.matches
  ADD CONSTRAINT matches_away_score_range
  CHECK (away_score IS NULL OR away_score BETWEEN 0 AND 30) NOT VALID;

ALTER TABLE public.predictions
  ADD CONSTRAINT predictions_home_score_range
  CHECK (home_score BETWEEN 0 AND 30) NOT VALID;

ALTER TABLE public.predictions
  ADD CONSTRAINT predictions_away_score_range
  CHECK (away_score BETWEEN 0 AND 30) NOT VALID;

ALTER TABLE public.predictions
  ADD CONSTRAINT predictions_points_valid
  CHECK (points IS NULL OR points IN (0, 1, 3)) NOT VALID;

CREATE TABLE IF NOT EXISTS public.access_codes (
  code       text        PRIMARY KEY CHECK (code ~ '^[A-Z0-9-]{4,32}$'),
  label      text,
  expires_at timestamptz,
  used_by    uuid        UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  used_at    timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- -------------------------------------------------------------
-- Helpers y triggers
-- -------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_predictions_updated_at ON public.predictions;
CREATE TRIGGER trg_predictions_updated_at
BEFORE UPDATE ON public.predictions
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.set_match_locked_at()
RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW.locked_at := NEW.scheduled_at;
  RETURN NEW;
END;
$$;

UPDATE public.matches
SET locked_at = scheduled_at
WHERE scheduled_at IS NOT NULL;

ALTER TABLE public.matches
  ALTER COLUMN locked_at SET NOT NULL;

DROP TRIGGER IF EXISTS trg_match_locked_at ON public.matches;
CREATE TRIGGER trg_match_locked_at
BEFORE INSERT OR UPDATE OF scheduled_at ON public.matches
FOR EACH ROW EXECUTE FUNCTION public.set_match_locked_at();

CREATE OR REPLACE FUNCTION public.calculate_prediction_points(
  pred_home int,
  pred_away int,
  real_home int,
  real_away int
) RETURNS int
LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
  IF real_home IS NULL OR real_away IS NULL THEN
    RETURN NULL;
  END IF;

  IF pred_home = real_home AND pred_away = real_away THEN
    RETURN 3;
  END IF;

  IF sign(pred_home - pred_away) = sign(real_home - real_away) THEN
    RETURN 1;
  END IF;

  RETURN 0;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_prediction_points()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF NEW.status = 'finished'
     AND NEW.home_score IS NOT NULL
     AND NEW.away_score IS NOT NULL THEN
    UPDATE public.predictions
    SET
      points = public.calculate_prediction_points(
        predictions.home_score,
        predictions.away_score,
        NEW.home_score,
        NEW.away_score
      ),
      updated_at = now()
    WHERE match_id = NEW.id;
  ELSE
    UPDATE public.predictions
    SET points = NULL, updated_at = now()
    WHERE match_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_match_result_points ON public.matches;
DROP TRIGGER IF EXISTS on_match_result_updated ON public.matches;
CREATE TRIGGER trg_match_result_points
AFTER UPDATE OF home_score, away_score, status ON public.matches
FOR EACH ROW EXECUTE FUNCTION public.update_prediction_points();

CREATE OR REPLACE FUNCTION public.current_user_is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND is_admin = true
  );
$$;

-- -------------------------------------------------------------
-- RPCs seguras
-- -------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.claim_access_code(
  p_code text,
  p_name text DEFAULT NULL,
  p_avatar_url text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_email text := NULLIF(auth.jwt() ->> 'email', '');
  v_code text := upper(trim(coalesce(p_code, '')));
  v_name text := left(coalesce(NULLIF(trim(p_name), ''), 'Jugador'), 80);
  v_avatar_url text := NULLIF(trim(p_avatar_url), '');
BEGIN
  IF v_user_id IS NULL OR v_email IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  IF v_code !~ '^[A-Z0-9-]{4,32}$' THEN
    RAISE EXCEPTION 'Codigo de acceso invalido';
  END IF;

  UPDATE public.access_codes
  SET
    used_by = v_user_id,
    used_at = coalesce(used_at, now())
  WHERE code = v_code
    AND (expires_at IS NULL OR expires_at > now())
    AND (used_by IS NULL OR used_by = v_user_id);

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Codigo de acceso invalido o usado';
  END IF;

  INSERT INTO public.profiles (id, email, name, avatar_url)
  VALUES (v_user_id, v_email, v_name, v_avatar_url)
  ON CONFLICT (id) DO UPDATE
  SET
    email = excluded.email,
    name = excluded.name,
    avatar_url = excluded.avatar_url,
    updated_at = now();
END;
$$;

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
     OR p_home_score > 30
     OR p_away_score > 30 THEN
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
  saved_count int := 0;
BEGIN
  IF jsonb_typeof(p_predictions) <> 'array' THEN
    RAISE EXCEPTION 'Formato invalido';
  END IF;

  FOR item IN
    SELECT *
    FROM jsonb_to_recordset(p_predictions)
      AS x(match_id uuid, home_score int, away_score int)
  LOOP
    PERFORM public.save_prediction(item.match_id, item.home_score, item.away_score);
    saved_count := saved_count + 1;
  END LOOP;

  RETURN saved_count;
END;
$$;

-- -------------------------------------------------------------
-- Ranking publico
-- -------------------------------------------------------------

DROP VIEW IF EXISTS public.ranking_entries;
CREATE VIEW public.ranking_entries
WITH (security_invoker = false) AS
SELECT
  pr.id AS user_id,
  pr.name,
  pr.avatar_url,
  COALESCE(SUM(p.points), 0)::int AS total_points,
  COUNT(*) FILTER (WHERE p.points = 3)::int AS exact_predictions,
  COUNT(*) FILTER (WHERE p.points = 1)::int AS correct_result_predictions,
  RANK() OVER (
    ORDER BY COALESCE(SUM(p.points), 0) DESC,
             COUNT(*) FILTER (WHERE p.points = 3) DESC,
             pr.created_at ASC
  )::int AS rank
FROM public.profiles pr
LEFT JOIN public.predictions p ON p.user_id = pr.id
GROUP BY pr.id, pr.name, pr.avatar_url, pr.created_at;

-- -------------------------------------------------------------
-- RLS y politicas finales
-- -------------------------------------------------------------

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.predictions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles: read all" ON public.profiles;
DROP POLICY IF EXISTS "profiles: insert own" ON public.profiles;
DROP POLICY IF EXISTS "profiles: update own" ON public.profiles;
DROP POLICY IF EXISTS profiles_select_authenticated ON public.profiles;
DROP POLICY IF EXISTS profiles_update_own ON public.profiles;

DROP POLICY IF EXISTS "matches: read all" ON public.matches;
DROP POLICY IF EXISTS matches_select_authenticated ON public.matches;
DROP POLICY IF EXISTS matches_admin_write ON public.matches;
DROP POLICY IF EXISTS matches_admin_update ON public.matches;

DROP POLICY IF EXISTS "predictions: read all" ON public.predictions;
DROP POLICY IF EXISTS "predictions: read own" ON public.predictions;
DROP POLICY IF EXISTS "predictions: insert own" ON public.predictions;
DROP POLICY IF EXISTS "predictions: update own" ON public.predictions;
DROP POLICY IF EXISTS predictions_select_own ON public.predictions;
DROP POLICY IF EXISTS predictions_insert_own ON public.predictions;
DROP POLICY IF EXISTS predictions_update_own ON public.predictions;
DROP POLICY IF EXISTS predictions_insert_own_open_match ON public.predictions;
DROP POLICY IF EXISTS predictions_update_own_open_match ON public.predictions;

CREATE POLICY profiles_select_authenticated
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY matches_select_authenticated
  ON public.matches FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY matches_admin_update
  ON public.matches FOR UPDATE
  TO authenticated
  USING (public.current_user_is_admin())
  WITH CHECK (public.current_user_is_admin());

CREATE POLICY predictions_select_own
  ON public.predictions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY predictions_insert_own_open_match
  ON public.predictions FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1
      FROM public.matches m
      WHERE m.id = match_id
        AND m.status = 'upcoming'
        AND now() < m.locked_at
    )
  );

CREATE POLICY predictions_update_own_open_match
  ON public.predictions FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1
      FROM public.matches m
      WHERE m.id = match_id
        AND m.status = 'upcoming'
        AND now() < m.locked_at
    )
  )
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1
      FROM public.matches m
      WHERE m.id = match_id
        AND m.status = 'upcoming'
        AND now() < m.locked_at
    )
  );

-- -------------------------------------------------------------
-- Grants minimos
-- -------------------------------------------------------------

REVOKE ALL ON public.profiles FROM anon, authenticated;
REVOKE ALL ON public.access_codes FROM anon, authenticated;
REVOKE ALL ON public.matches FROM anon, authenticated;
REVOKE ALL ON public.predictions FROM anon, authenticated;

GRANT SELECT ON public.profiles TO authenticated;
GRANT SELECT ON public.matches TO authenticated;
GRANT UPDATE (home_score, away_score, status) ON public.matches TO authenticated;
GRANT SELECT ON public.predictions TO authenticated;
GRANT SELECT ON public.ranking_entries TO anon, authenticated;

GRANT EXECUTE ON FUNCTION public.claim_access_code(text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_prediction(uuid, int, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_predictions(jsonb) TO authenticated;
