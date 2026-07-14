-- Etapa 3: normalizacion admin de apuestas especiales y resultados oficiales.
-- No toca special_bets, predictions, ranking, RPCs de puntos ni scoring.

CREATE UNIQUE INDEX IF NOT EXISTS players_normalized_name_unique_idx
  ON public.players (normalized_name);

CREATE TABLE IF NOT EXISTS public.player_aliases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  alias_raw text NOT NULL,
  alias_normalized text NOT NULL,
  source text NOT NULL DEFAULT 'manual',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT player_aliases_alias_raw_not_blank
    CHECK (length(btrim(alias_raw)) > 0),
  CONSTRAINT player_aliases_alias_normalized_not_blank
    CHECK (length(btrim(alias_normalized)) > 0),
  CONSTRAINT player_aliases_source_not_blank
    CHECK (length(btrim(source)) > 0),
  CONSTRAINT player_aliases_player_alias_unique
    UNIQUE (player_id, alias_raw)
);

CREATE TABLE IF NOT EXISTS public.special_bet_normalizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_key text NOT NULL DEFAULT 'world-cup-2026',
  category text NOT NULL,
  raw_value text NOT NULL,
  raw_normalized text NOT NULL,
  player_id uuid NULL REFERENCES public.players(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'review',
  reviewed_by uuid NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at timestamptz NULL,
  notes text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT special_bet_normalizations_category_valid
    CHECK (category IN ('balon', 'bota', 'guante')),
  CONSTRAINT special_bet_normalizations_status_valid
    CHECK (status IN ('matched', 'no_match', 'review')),
  CONSTRAINT special_bet_normalizations_tournament_key_not_blank
    CHECK (length(btrim(tournament_key)) > 0),
  CONSTRAINT special_bet_normalizations_raw_value_not_blank
    CHECK (length(btrim(raw_value)) > 0),
  CONSTRAINT special_bet_normalizations_raw_normalized_not_blank
    CHECK (length(btrim(raw_normalized)) > 0),
  CONSTRAINT special_bet_normalizations_matched_requires_player
    CHECK (status <> 'matched' OR player_id IS NOT NULL),
  CONSTRAINT special_bet_normalizations_unique_raw
    UNIQUE (tournament_key, category, raw_normalized)
);

CREATE TABLE IF NOT EXISTS public.special_bet_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_key text NOT NULL DEFAULT 'world-cup-2026',
  category text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  confirmed_at timestamptz NULL,
  confirmed_by uuid NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  locked_at timestamptz NULL,
  locked_by uuid NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_by uuid NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT special_bet_results_category_valid
    CHECK (category IN ('balon', 'bota', 'guante')),
  CONSTRAINT special_bet_results_status_valid
    CHECK (status IN ('draft', 'confirmed', 'locked')),
  CONSTRAINT special_bet_results_tournament_key_not_blank
    CHECK (length(btrim(tournament_key)) > 0),
  CONSTRAINT special_bet_results_unique_category
    UNIQUE (tournament_key, category)
);

CREATE TABLE IF NOT EXISTS public.special_bet_result_winners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  special_bet_result_id uuid NOT NULL REFERENCES public.special_bet_results(id) ON DELETE CASCADE,
  player_id uuid NOT NULL REFERENCES public.players(id) ON DELETE RESTRICT,
  created_by uuid NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT special_bet_result_winners_unique_player
    UNIQUE (special_bet_result_id, player_id)
);

CREATE INDEX IF NOT EXISTS player_aliases_alias_normalized_idx
  ON public.player_aliases (alias_normalized);

CREATE INDEX IF NOT EXISTS special_bet_normalizations_tournament_category_status_idx
  ON public.special_bet_normalizations (tournament_key, category, status);

CREATE INDEX IF NOT EXISTS special_bet_normalizations_player_id_idx
  ON public.special_bet_normalizations (player_id)
  WHERE player_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS special_bet_normalizations_reviewed_by_idx
  ON public.special_bet_normalizations (reviewed_by)
  WHERE reviewed_by IS NOT NULL;

CREATE INDEX IF NOT EXISTS special_bet_results_confirmed_by_idx
  ON public.special_bet_results (confirmed_by)
  WHERE confirmed_by IS NOT NULL;

CREATE INDEX IF NOT EXISTS special_bet_results_locked_by_idx
  ON public.special_bet_results (locked_by)
  WHERE locked_by IS NOT NULL;

CREATE INDEX IF NOT EXISTS special_bet_results_updated_by_idx
  ON public.special_bet_results (updated_by)
  WHERE updated_by IS NOT NULL;

CREATE INDEX IF NOT EXISTS special_bet_result_winners_player_id_idx
  ON public.special_bet_result_winners (player_id);

CREATE INDEX IF NOT EXISTS special_bet_result_winners_created_by_idx
  ON public.special_bet_result_winners (created_by)
  WHERE created_by IS NOT NULL;

DROP TRIGGER IF EXISTS trg_player_aliases_updated_at ON public.player_aliases;
CREATE TRIGGER trg_player_aliases_updated_at
BEFORE UPDATE ON public.player_aliases
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_special_bet_normalizations_updated_at ON public.special_bet_normalizations;
CREATE TRIGGER trg_special_bet_normalizations_updated_at
BEFORE UPDATE ON public.special_bet_normalizations
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_special_bet_results_updated_at ON public.special_bet_results;
CREATE TRIGGER trg_special_bet_results_updated_at
BEFORE UPDATE ON public.special_bet_results
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.player_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.special_bet_normalizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.special_bet_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.special_bet_result_winners ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS player_aliases_select_admin ON public.player_aliases;
CREATE POLICY player_aliases_select_admin
  ON public.player_aliases FOR SELECT
  TO authenticated
  USING (public.current_user_is_admin());

DROP POLICY IF EXISTS player_aliases_admin_insert ON public.player_aliases;
CREATE POLICY player_aliases_admin_insert
  ON public.player_aliases FOR INSERT
  TO authenticated
  WITH CHECK (public.current_user_is_admin());

DROP POLICY IF EXISTS player_aliases_admin_update ON public.player_aliases;
CREATE POLICY player_aliases_admin_update
  ON public.player_aliases FOR UPDATE
  TO authenticated
  USING (public.current_user_is_admin())
  WITH CHECK (public.current_user_is_admin());

DROP POLICY IF EXISTS player_aliases_admin_delete ON public.player_aliases;
CREATE POLICY player_aliases_admin_delete
  ON public.player_aliases FOR DELETE
  TO authenticated
  USING (public.current_user_is_admin());

DROP POLICY IF EXISTS special_bet_normalizations_select_admin ON public.special_bet_normalizations;
CREATE POLICY special_bet_normalizations_select_admin
  ON public.special_bet_normalizations FOR SELECT
  TO authenticated
  USING (public.current_user_is_admin());

DROP POLICY IF EXISTS special_bet_normalizations_admin_insert ON public.special_bet_normalizations;
CREATE POLICY special_bet_normalizations_admin_insert
  ON public.special_bet_normalizations FOR INSERT
  TO authenticated
  WITH CHECK (public.current_user_is_admin());

DROP POLICY IF EXISTS special_bet_normalizations_admin_update ON public.special_bet_normalizations;
CREATE POLICY special_bet_normalizations_admin_update
  ON public.special_bet_normalizations FOR UPDATE
  TO authenticated
  USING (public.current_user_is_admin())
  WITH CHECK (public.current_user_is_admin());

DROP POLICY IF EXISTS special_bet_normalizations_admin_delete ON public.special_bet_normalizations;
CREATE POLICY special_bet_normalizations_admin_delete
  ON public.special_bet_normalizations FOR DELETE
  TO authenticated
  USING (public.current_user_is_admin());

DROP POLICY IF EXISTS special_bet_results_select_admin ON public.special_bet_results;
CREATE POLICY special_bet_results_select_admin
  ON public.special_bet_results FOR SELECT
  TO authenticated
  USING (public.current_user_is_admin());

DROP POLICY IF EXISTS special_bet_results_admin_insert ON public.special_bet_results;
CREATE POLICY special_bet_results_admin_insert
  ON public.special_bet_results FOR INSERT
  TO authenticated
  WITH CHECK (public.current_user_is_admin());

DROP POLICY IF EXISTS special_bet_results_admin_update ON public.special_bet_results;
CREATE POLICY special_bet_results_admin_update
  ON public.special_bet_results FOR UPDATE
  TO authenticated
  USING (public.current_user_is_admin())
  WITH CHECK (public.current_user_is_admin());

DROP POLICY IF EXISTS special_bet_results_admin_delete ON public.special_bet_results;
CREATE POLICY special_bet_results_admin_delete
  ON public.special_bet_results FOR DELETE
  TO authenticated
  USING (public.current_user_is_admin());

DROP POLICY IF EXISTS special_bet_result_winners_select_admin ON public.special_bet_result_winners;
CREATE POLICY special_bet_result_winners_select_admin
  ON public.special_bet_result_winners FOR SELECT
  TO authenticated
  USING (public.current_user_is_admin());

DROP POLICY IF EXISTS special_bet_result_winners_admin_insert ON public.special_bet_result_winners;
CREATE POLICY special_bet_result_winners_admin_insert
  ON public.special_bet_result_winners FOR INSERT
  TO authenticated
  WITH CHECK (public.current_user_is_admin());

DROP POLICY IF EXISTS special_bet_result_winners_admin_update ON public.special_bet_result_winners;
CREATE POLICY special_bet_result_winners_admin_update
  ON public.special_bet_result_winners FOR UPDATE
  TO authenticated
  USING (public.current_user_is_admin())
  WITH CHECK (public.current_user_is_admin());

DROP POLICY IF EXISTS special_bet_result_winners_admin_delete ON public.special_bet_result_winners;
CREATE POLICY special_bet_result_winners_admin_delete
  ON public.special_bet_result_winners FOR DELETE
  TO authenticated
  USING (public.current_user_is_admin());

REVOKE ALL ON public.player_aliases FROM anon, authenticated;
REVOKE ALL ON public.special_bet_normalizations FROM anon, authenticated;
REVOKE ALL ON public.special_bet_results FROM anon, authenticated;
REVOKE ALL ON public.special_bet_result_winners FROM anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.player_aliases TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.special_bet_normalizations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.special_bet_results TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.special_bet_result_winners TO authenticated;

WITH seed_players (display_name, country_name, country_code) AS (
  VALUES
    ('Lionel Messi', 'Argentina', 'ARG'),
    ('Kylian Mbappé', 'Francia', 'FRA'),
    ('Emiliano Martínez', 'Argentina', 'ARG'),
    ('Julián Álvarez', 'Argentina', 'ARG'),
    ('Cristiano Ronaldo', 'Portugal', 'POR'),
    ('Raphinha', 'Brasil', 'BRA'),
    ('Vinícius Jr.', 'Brasil', 'BRA'),
    ('Rayan Cherki', 'Francia', 'FRA'),
    ('Ousmane Dembélé', 'Francia', 'FRA'),
    ('Michael Olise', 'Francia', 'FRA'),
    ('Erling Haaland', 'Noruega', 'NOR'),
    ('Lautaro Martínez', 'Argentina', 'ARG'),
    ('Harry Kane', 'Inglaterra', 'ENG'),
    ('Mike Maignan', 'Francia', 'FRA'),
    ('Unai Simón', 'España', 'ESP'),
    ('Diogo Costa', 'Portugal', 'POR'),
    ('Jordan Pickford', 'Inglaterra', 'ENG'),
    ('Manuel Neuer', 'Alemania', 'GER'),
    ('Bruno Fernandes', 'Portugal', 'POR'),
    ('Enzo Fernández', 'Argentina', 'ARG'),
    ('Lamine Yamal', 'España', 'ESP'),
    ('David Raya', 'España', 'ESP')
)
INSERT INTO public.players (display_name, normalized_name, country_name, country_code)
SELECT
  display_name,
  lower(regexp_replace(btrim(display_name), '\s+', ' ', 'g')),
  country_name,
  country_code
FROM seed_players
ON CONFLICT (normalized_name) DO UPDATE
SET
  country_name = coalesce(public.players.country_name, excluded.country_name),
  country_code = coalesce(public.players.country_code, excluded.country_code),
  updated_at = now();

WITH seed_aliases (display_name, alias_raw) AS (
  VALUES
    ('Lionel Messi', 'Messi'),
    ('Lionel Messi', 'Lionel Messi'),
    ('Lionel Messi', 'Lionel  Messi'),
    ('Lionel Messi', 'Fressi'),
    ('Kylian Mbappé', 'Mbappe'),
    ('Kylian Mbappé', 'Mbappé'),
    ('Kylian Mbappé', 'Kylian Mbappe'),
    ('Kylian Mbappé', 'Kylian Mbappé'),
    ('Kylian Mbappé', 'mbbape'),
    ('Emiliano Martínez', 'Dibu'),
    ('Emiliano Martínez', 'DIBU'),
    ('Emiliano Martínez', 'Dibu Martínez'),
    ('Emiliano Martínez', 'Dibu Martinez'),
    ('Emiliano Martínez', 'Dibu martinez'),
    ('Emiliano Martínez', 'Dibu  Martinez'),
    ('Emiliano Martínez', 'Dibuu'),
    ('Emiliano Martínez', 'Dibujo'),
    ('Emiliano Martínez', 'Martínez dibu'),
    ('Emiliano Martínez', 'Emi Martinez'),
    ('Emiliano Martínez', 'Emiliano Martinez'),
    ('Emiliano Martínez', 'Emiliano Martínez'),
    ('Emiliano Martínez', 'Emiliano Marínez'),
    ('Emiliano Martínez', 'Emiliano martinez'),
    ('Julián Álvarez', 'J Álvarez'),
    ('Julián Álvarez', 'Julian Alvarez'),
    ('Julián Álvarez', 'Julián Alvarez'),
    ('Julián Álvarez', 'Julián Álvarez'),
    ('Julián Álvarez', 'Álvarez Julián'),
    ('Cristiano Ronaldo', 'C Ronaldo'),
    ('Cristiano Ronaldo', 'Cristiano Ronaldo'),
    ('Cristiano Ronaldo', 'Ronaldo'),
    ('Raphinha', 'Raphina'),
    ('Vinícius Jr.', 'Vinicius'),
    ('Rayan Cherki', 'Cherki'),
    ('Ousmane Dembélé', 'dembele'),
    ('Ousmane Dembélé', 'Dembele'),
    ('Michael Olise', 'Olise'),
    ('Michael Olise', 'olise'),
    ('Michael Olise', 'Michael Olise'),
    ('Michael Olise', 'Olisse'),
    ('Erling Haaland', 'Haaland'),
    ('Lautaro Martínez', 'Lautaro'),
    ('Lautaro Martínez', 'Lautaro Martinez'),
    ('Harry Kane', 'Kane'),
    ('Harry Kane', 'Harry Kane'),
    ('Mike Maignan', 'Maigan'),
    ('Mike Maignan', 'maignan'),
    ('Mike Maignan', 'Mike Maignan'),
    ('Unai Simón', 'Unai Simon'),
    ('Unai Simón', 'Unai Simón'),
    ('Diogo Costa', 'Diogo costa'),
    ('Jordan Pickford', 'Pickford'),
    ('Manuel Neuer', 'Neuer'),
    ('Bruno Fernandes', 'Bruno Fernandes'),
    ('Enzo Fernández', 'Enzo Fernández'),
    ('Lamine Yamal', 'Lamine Yamal'),
    ('David Raya', 'David Raya')
)
INSERT INTO public.player_aliases (player_id, alias_raw, alias_normalized, source)
SELECT
  players.id,
  seed_aliases.alias_raw,
  lower(regexp_replace(btrim(seed_aliases.alias_raw), '\s+', ' ', 'g')),
  'manual'
FROM seed_aliases
JOIN public.players
  ON players.normalized_name = lower(regexp_replace(btrim(seed_aliases.display_name), '\s+', ' ', 'g'))
ON CONFLICT (player_id, alias_raw) DO UPDATE
SET
  alias_normalized = excluded.alias_normalized,
  source = excluded.source,
  updated_at = now();
