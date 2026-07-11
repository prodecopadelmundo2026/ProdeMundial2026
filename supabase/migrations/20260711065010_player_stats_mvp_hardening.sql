CREATE OR REPLACE FUNCTION public.set_player_tournament_stat_updated_by()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, auth
AS $$
BEGIN
  NEW.updated_by := coalesce(auth.uid(), NEW.updated_by);
  RETURN NEW;
END;
$$;

CREATE INDEX IF NOT EXISTS player_tournament_stat_values_stat_type_id_idx
  ON public.player_tournament_stat_values (stat_type_id);

CREATE INDEX IF NOT EXISTS player_tournament_stat_values_updated_by_idx
  ON public.player_tournament_stat_values (updated_by)
  WHERE updated_by IS NOT NULL;
