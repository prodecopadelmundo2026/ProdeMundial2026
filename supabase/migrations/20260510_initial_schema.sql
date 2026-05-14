-- =============================================================
-- Prode Mundial 2026 — Schema inicial
-- Ejecutar en Supabase SQL Editor
-- =============================================================

-- -------------------------------------------------------
-- TABLAS
-- -------------------------------------------------------

CREATE TABLE profiles (
  id         uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email      text NOT NULL,
  name       text NOT NULL,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE matches (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  home_team  text NOT NULL,
  away_team  text NOT NULL,
  home_score int,
  away_score int,
  scheduled_at timestamptz NOT NULL,
  locked_at    timestamptz,
  stage      text NOT NULL CHECK (stage IN ('group','round_of_16','quarter','semi','final')),
  "group"    text,
  status     text NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming','live','finished')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE predictions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  match_id   uuid NOT NULL REFERENCES matches(id)  ON DELETE CASCADE,
  home_score int NOT NULL,
  away_score int NOT NULL,
  points     int,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, match_id)
);

-- -------------------------------------------------------
-- TRIGGER: locked_at = scheduled_at - 5 minutos
-- -------------------------------------------------------

CREATE OR REPLACE FUNCTION set_match_locked_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.locked_at := NEW.scheduled_at - interval '5 minutes';
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_match_locked_at
BEFORE INSERT OR UPDATE OF scheduled_at ON matches
FOR EACH ROW EXECUTE FUNCTION set_match_locked_at();

-- -------------------------------------------------------
-- TRIGGER: updated_at automático
-- -------------------------------------------------------

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_profiles_updated_at
BEFORE UPDATE ON profiles
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_predictions_updated_at
BEFORE UPDATE ON predictions
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- -------------------------------------------------------
-- FUNCIÓN: calcular puntos de una predicción
--   3 pts → resultado exacto
--   1 pt  → resultado correcto (ganador / empate)
--   0 pts → todo mal
-- -------------------------------------------------------

CREATE OR REPLACE FUNCTION calculate_prediction_points(
  p_home_pred  int,
  p_away_pred  int,
  p_home_real  int,
  p_away_real  int
) RETURNS int LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
  IF p_home_pred = p_home_real AND p_away_pred = p_away_real THEN
    RETURN 3;
  ELSIF
    SIGN(p_home_pred - p_away_pred) = SIGN(p_home_real - p_away_real)
  THEN
    RETURN 1;
  ELSE
    RETURN 0;
  END IF;
END;
$$;

-- -------------------------------------------------------
-- TRIGGER: actualizar puntos al cargar resultado
-- -------------------------------------------------------

CREATE OR REPLACE FUNCTION update_prediction_points()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  -- Solo actúa cuando se carga el resultado final
  IF NEW.home_score IS NOT NULL AND NEW.away_score IS NOT NULL THEN
    UPDATE predictions
    SET points = calculate_prediction_points(
                   home_score, away_score,
                   NEW.home_score, NEW.away_score
                 )
    WHERE match_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_match_result_points
AFTER UPDATE OF home_score, away_score ON matches
FOR EACH ROW EXECUTE FUNCTION update_prediction_points();

-- -------------------------------------------------------
-- VISTA: ranking
-- -------------------------------------------------------

CREATE OR REPLACE VIEW ranking_entries AS
SELECT
  p.id                                                          AS user_id,
  p.name,
  p.avatar_url,
  COALESCE(SUM(pr.points), 0)::int                             AS total_points,
  COUNT(*) FILTER (WHERE pr.points = 3)::int                   AS exact_predictions,
  COUNT(*) FILTER (WHERE pr.points = 1)::int                   AS correct_result_predictions,
  RANK() OVER (ORDER BY COALESCE(SUM(pr.points), 0) DESC)::int AS rank
FROM profiles p
LEFT JOIN predictions pr ON pr.user_id = p.id
GROUP BY p.id, p.name, p.avatar_url;

-- -------------------------------------------------------
-- ROW LEVEL SECURITY
-- -------------------------------------------------------

ALTER TABLE profiles    ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches     ENABLE ROW LEVEL SECURITY;
ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;

-- profiles: cualquier usuario autenticado lee, solo el propio puede editar
CREATE POLICY "profiles: read all"
  ON profiles FOR SELECT TO authenticated USING (true);

CREATE POLICY "profiles: insert own"
  ON profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

CREATE POLICY "profiles: update own"
  ON profiles FOR UPDATE TO authenticated USING (id = auth.uid());

-- matches: todos los autenticados leen; solo service_role escribe
CREATE POLICY "matches: read all"
  ON matches FOR SELECT TO authenticated USING (true);

-- predictions: cada usuario lee/escribe/modifica solo las suyas
CREATE POLICY "predictions: read own"
  ON predictions FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "predictions: insert own"
  ON predictions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "predictions: update own"
  ON predictions FOR UPDATE TO authenticated USING (user_id = auth.uid());
