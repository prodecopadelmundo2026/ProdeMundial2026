-- =============================================================
-- PRODE MUNDIAL 2026 — Schema SQL
-- Ejecutar en Supabase SQL Editor (una sola vez, en orden)
-- =============================================================

-- ---------------------------------------------------------------
-- 1. TABLAS
-- ---------------------------------------------------------------

CREATE TABLE public.profiles (
  id          uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       text        NOT NULL,
  name        text        NOT NULL DEFAULT 'Jugador',
  avatar_url  text,
  is_admin    boolean     NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.matches (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  home_team    text        NOT NULL,
  away_team    text        NOT NULL,
  home_score   int,
  away_score   int,
  scheduled_at timestamptz NOT NULL,
  locked_at    timestamptz NOT NULL,  -- cierre de predicciones (= scheduled_at en producción)
  stage        text        NOT NULL CHECK (stage IN ('group','round_of_32','round_of_16','quarter','semi','third_place','final')),
  "group"      text,                  -- solo para stage='group', ej: 'A', 'B', ...
  status       text        NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming','live','finished')),
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.predictions (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  match_id    uuid        NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  home_score  int         NOT NULL CHECK (home_score >= 0),
  away_score  int         NOT NULL CHECK (away_score >= 0),
  points      int,                    -- null = partido no finalizado; 0/1/3 = calculado
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, match_id)
);

-- ---------------------------------------------------------------
-- 2. FUNCIÓN DE SCORING
-- ---------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.calculate_prediction_points(
  pred_home int, pred_away int,
  real_home int, real_away int
) RETURNS int
LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  pred_result text;
  real_result text;
BEGIN
  IF real_home IS NULL OR real_away IS NULL THEN RETURN NULL; END IF;
  -- Exacto: 3 pts
  IF pred_home = real_home AND pred_away = real_away THEN RETURN 3; END IF;
  -- Resultado correcto: 1 pt
  pred_result := CASE WHEN pred_home > pred_away THEN 'home'
                      WHEN pred_home < pred_away THEN 'away'
                      ELSE 'draw' END;
  real_result := CASE WHEN real_home > real_away THEN 'home'
                      WHEN real_home < real_away THEN 'away'
                      ELSE 'draw' END;
  IF pred_result = real_result THEN RETURN 1; END IF;
  RETURN 0;
END;
$$;

-- ---------------------------------------------------------------
-- 3. TRIGGER: actualizar puntos al cargar resultado
-- ---------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.update_prediction_points()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER AS $$  -- SECURITY DEFINER para bypassear RLS
BEGIN
  IF NEW.status = 'finished'
     AND NEW.home_score IS NOT NULL
     AND NEW.away_score IS NOT NULL
  THEN
    UPDATE public.predictions
    SET
      points     = public.calculate_prediction_points(
                     predictions.home_score, predictions.away_score,
                     NEW.home_score, NEW.away_score),
      updated_at = now()
    WHERE match_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_match_result_updated
  AFTER UPDATE ON public.matches
  FOR EACH ROW
  WHEN (
    OLD.status IS DISTINCT FROM NEW.status
    OR OLD.home_score IS DISTINCT FROM NEW.home_score
    OR OLD.away_score IS DISTINCT FROM NEW.away_score
  )
  EXECUTE FUNCTION public.update_prediction_points();

-- ---------------------------------------------------------------
-- 4. VISTA: ranking_entries
-- ---------------------------------------------------------------

CREATE OR REPLACE VIEW public.ranking_entries AS
SELECT
  pr.id                                                    AS user_id,
  pr.name,
  pr.avatar_url,
  COALESCE(SUM(p.points), 0)                               AS total_points,
  COUNT(*) FILTER (WHERE p.points = 3)                     AS exact_predictions,
  COUNT(*) FILTER (WHERE p.points = 1)                     AS correct_result_predictions,
  RANK() OVER (
    ORDER BY COALESCE(SUM(p.points), 0) DESC,
             COUNT(*) FILTER (WHERE p.points = 3) DESC
  )                                                        AS rank
FROM public.profiles pr
LEFT JOIN public.predictions p ON p.user_id = pr.id
GROUP BY pr.id, pr.name, pr.avatar_url;

-- ---------------------------------------------------------------
-- 5. ROW LEVEL SECURITY
-- ---------------------------------------------------------------

ALTER TABLE public.profiles   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.predictions ENABLE ROW LEVEL SECURITY;

-- profiles: todo usuario autenticado puede leer perfiles (necesario para ranking)
CREATE POLICY "profiles_select_authenticated"
  ON public.profiles FOR SELECT
  USING (auth.role() = 'authenticated');

-- profiles: cada usuario actualiza solo el suyo
CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- profiles: insert solo via callback (server-side) — no se permite desde cliente
-- (el upsert en auth/callback/route.ts usa service_role implícitamente vía SSR key)

-- matches: lectura pública para todos los autenticados
CREATE POLICY "matches_select_authenticated"
  ON public.matches FOR SELECT
  USING (auth.role() = 'authenticated');

-- matches: solo admins pueden crear/editar/borrar
CREATE POLICY "matches_admin_write"
  ON public.matches FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- predictions: cada usuario lee/edita/inserta solo las suyas
CREATE POLICY "predictions_select_own"
  ON public.predictions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "predictions_insert_own"
  ON public.predictions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "predictions_update_own"
  ON public.predictions FOR UPDATE
  USING (auth.uid() = user_id);

-- ---------------------------------------------------------------
-- 6. DATOS EJEMPLO — eliminar antes de producción
-- ---------------------------------------------------------------

-- INSERT INTO public.matches (home_team, away_team, scheduled_at, locked_at, stage, "group") VALUES
-- ('Argentina', 'Canadá',   '2026-06-11 20:00:00+00', '2026-06-11 20:00:00+00', 'group', 'A'),
-- ('México',    'Ecuador',  '2026-06-12 23:00:00+00', '2026-06-12 23:00:00+00', 'group', 'B');

-- Para hacer admin a un usuario (reemplazar con UUID real de auth.users):
-- UPDATE public.profiles SET is_admin = true WHERE email = 'tu@email.com';
