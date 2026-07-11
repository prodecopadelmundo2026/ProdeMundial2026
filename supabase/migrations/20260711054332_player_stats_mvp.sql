-- MVP de estadisticas personales de jugadores.
-- Solo prepara catalogo de jugadores, tipos de estadisticas y valores actuales.
-- No toca special_bets, predictions, ranking, RPCs de puntos ni scoring.
-- La lectura publica de goleadores se disena en una etapa posterior.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name text NOT NULL,
  normalized_name text NOT NULL,
  country_code text NULL,
  country_name text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT players_display_name_not_blank
    CHECK (length(btrim(display_name)) > 0),
  CONSTRAINT players_normalized_name_not_blank
    CHECK (length(btrim(normalized_name)) > 0),
  CONSTRAINT players_country_code_not_blank
    CHECK (country_code IS NULL OR length(btrim(country_code)) > 0),
  CONSTRAINT players_country_name_not_blank
    CHECK (country_name IS NULL OR length(btrim(country_name)) > 0)
);

CREATE TABLE IF NOT EXISTS public.player_stat_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  label text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT player_stat_types_key_format
    CHECK (key = lower(btrim(key)) AND key ~ '^[a-z][a-z0-9_]*$'),
  CONSTRAINT player_stat_types_label_not_blank
    CHECK (length(btrim(label)) > 0)
);

CREATE TABLE IF NOT EXISTS public.player_tournament_stat_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_key text NOT NULL DEFAULT 'world-cup-2026',
  player_id uuid NOT NULL REFERENCES public.players(id) ON DELETE RESTRICT,
  stat_type_id uuid NOT NULL REFERENCES public.player_stat_types(id) ON DELETE RESTRICT,
  value integer NOT NULL DEFAULT 0,
  source_note text NULL,
  source_url text NULL,
  updated_by uuid NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT player_tournament_stat_values_tournament_key_not_blank
    CHECK (length(btrim(tournament_key)) > 0),
  CONSTRAINT player_tournament_stat_values_value_non_negative
    CHECK (value >= 0),
  CONSTRAINT player_tournament_stat_values_source_note_not_blank
    CHECK (source_note IS NULL OR length(btrim(source_note)) > 0),
  CONSTRAINT player_tournament_stat_values_source_url_not_blank
    CHECK (source_url IS NULL OR length(btrim(source_url)) > 0),
  CONSTRAINT player_tournament_stat_values_unique_stat
    UNIQUE (tournament_key, player_id, stat_type_id)
);

CREATE INDEX IF NOT EXISTS players_normalized_name_idx
  ON public.players (normalized_name);

CREATE INDEX IF NOT EXISTS players_country_code_idx
  ON public.players (country_code)
  WHERE country_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS player_stat_types_active_display_order_idx
  ON public.player_stat_types (is_active, display_order, key);

CREATE INDEX IF NOT EXISTS player_tournament_stat_values_tournament_stat_value_idx
  ON public.player_tournament_stat_values (tournament_key, stat_type_id, value DESC, player_id);

CREATE INDEX IF NOT EXISTS player_tournament_stat_values_player_id_idx
  ON public.player_tournament_stat_values (player_id);

CREATE OR REPLACE FUNCTION public.set_player_tournament_stat_updated_by()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_by := coalesce(auth.uid(), NEW.updated_by);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_players_updated_at ON public.players;
CREATE TRIGGER trg_players_updated_at
BEFORE UPDATE ON public.players
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_player_stat_types_updated_at ON public.player_stat_types;
CREATE TRIGGER trg_player_stat_types_updated_at
BEFORE UPDATE ON public.player_stat_types
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_player_tournament_stat_values_updated_at ON public.player_tournament_stat_values;
CREATE TRIGGER trg_player_tournament_stat_values_updated_at
BEFORE UPDATE ON public.player_tournament_stat_values
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_player_tournament_stat_values_updated_by ON public.player_tournament_stat_values;
CREATE TRIGGER trg_player_tournament_stat_values_updated_by
BEFORE INSERT OR UPDATE ON public.player_tournament_stat_values
FOR EACH ROW EXECUTE FUNCTION public.set_player_tournament_stat_updated_by();

ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_stat_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_tournament_stat_values ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS players_select_admin ON public.players;
CREATE POLICY players_select_admin
  ON public.players FOR SELECT
  TO authenticated
  USING (public.current_user_is_admin());

DROP POLICY IF EXISTS players_admin_insert ON public.players;
CREATE POLICY players_admin_insert
  ON public.players FOR INSERT
  TO authenticated
  WITH CHECK (public.current_user_is_admin());

DROP POLICY IF EXISTS players_admin_update ON public.players;
CREATE POLICY players_admin_update
  ON public.players FOR UPDATE
  TO authenticated
  USING (public.current_user_is_admin())
  WITH CHECK (public.current_user_is_admin());

DROP POLICY IF EXISTS players_admin_delete ON public.players;
CREATE POLICY players_admin_delete
  ON public.players FOR DELETE
  TO authenticated
  USING (public.current_user_is_admin());

DROP POLICY IF EXISTS player_stat_types_select_admin ON public.player_stat_types;
CREATE POLICY player_stat_types_select_admin
  ON public.player_stat_types FOR SELECT
  TO authenticated
  USING (public.current_user_is_admin());

DROP POLICY IF EXISTS player_stat_types_admin_insert ON public.player_stat_types;
CREATE POLICY player_stat_types_admin_insert
  ON public.player_stat_types FOR INSERT
  TO authenticated
  WITH CHECK (public.current_user_is_admin());

DROP POLICY IF EXISTS player_stat_types_admin_update ON public.player_stat_types;
CREATE POLICY player_stat_types_admin_update
  ON public.player_stat_types FOR UPDATE
  TO authenticated
  USING (public.current_user_is_admin())
  WITH CHECK (public.current_user_is_admin());

DROP POLICY IF EXISTS player_tournament_stat_values_select_admin ON public.player_tournament_stat_values;
CREATE POLICY player_tournament_stat_values_select_admin
  ON public.player_tournament_stat_values FOR SELECT
  TO authenticated
  USING (public.current_user_is_admin());

DROP POLICY IF EXISTS player_tournament_stat_values_admin_insert ON public.player_tournament_stat_values;
CREATE POLICY player_tournament_stat_values_admin_insert
  ON public.player_tournament_stat_values FOR INSERT
  TO authenticated
  WITH CHECK (public.current_user_is_admin());

DROP POLICY IF EXISTS player_tournament_stat_values_admin_update ON public.player_tournament_stat_values;
CREATE POLICY player_tournament_stat_values_admin_update
  ON public.player_tournament_stat_values FOR UPDATE
  TO authenticated
  USING (public.current_user_is_admin())
  WITH CHECK (public.current_user_is_admin());

DROP POLICY IF EXISTS player_tournament_stat_values_admin_delete ON public.player_tournament_stat_values;
CREATE POLICY player_tournament_stat_values_admin_delete
  ON public.player_tournament_stat_values FOR DELETE
  TO authenticated
  USING (public.current_user_is_admin());

REVOKE ALL ON public.players FROM anon, authenticated;
REVOKE ALL ON public.player_stat_types FROM anon, authenticated;
REVOKE ALL ON public.player_tournament_stat_values FROM anon, authenticated;

GRANT SELECT ON public.players TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.players TO authenticated;

GRANT SELECT ON public.player_stat_types TO authenticated;
GRANT INSERT, UPDATE ON public.player_stat_types TO authenticated;

GRANT SELECT ON public.player_tournament_stat_values TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.player_tournament_stat_values TO authenticated;

INSERT INTO public.player_stat_types (key, label, display_order, is_active)
VALUES
  ('goals', 'Goles', 10, true),
  ('assists', 'Asistencias', 20, true),
  ('yellow_cards', 'Tarjetas amarillas', 30, true),
  ('red_cards', 'Tarjetas rojas', 40, true),
  ('tackles_won', 'Barridas ganadas', 50, true)
ON CONFLICT (key) DO UPDATE
SET
  label = excluded.label,
  display_order = excluded.display_order,
  updated_at = now();
