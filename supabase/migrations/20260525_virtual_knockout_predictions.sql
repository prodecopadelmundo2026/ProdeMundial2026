CREATE TABLE IF NOT EXISTS public.virtual_knockout_predictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  virtual_match_id text NOT NULL,
  home_score int NOT NULL,
  away_score int NOT NULL,
  tiebreaker_team text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT virtual_knockout_predictions_match_id_valid
    CHECK (virtual_match_id ~ '^virtual-p(7[3-9]|8[0-9]|9[0-9]|10[0-4])$'),
  CONSTRAINT virtual_knockout_predictions_home_score_range
    CHECK (home_score >= 0 AND home_score <= 99),
  CONSTRAINT virtual_knockout_predictions_away_score_range
    CHECK (away_score >= 0 AND away_score <= 99),
  CONSTRAINT virtual_knockout_predictions_unique_user_match
    UNIQUE (user_id, virtual_match_id)
);

CREATE INDEX IF NOT EXISTS virtual_knockout_predictions_user_id_idx
  ON public.virtual_knockout_predictions (user_id);

DROP TRIGGER IF EXISTS trg_virtual_knockout_predictions_updated_at ON public.virtual_knockout_predictions;
CREATE TRIGGER trg_virtual_knockout_predictions_updated_at
BEFORE UPDATE ON public.virtual_knockout_predictions
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.virtual_knockout_predictions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS virtual_knockout_predictions_select_own_or_admin ON public.virtual_knockout_predictions;
CREATE POLICY virtual_knockout_predictions_select_own_or_admin
  ON public.virtual_knockout_predictions FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.current_user_is_admin());

DROP POLICY IF EXISTS virtual_knockout_predictions_insert_own ON public.virtual_knockout_predictions;
CREATE POLICY virtual_knockout_predictions_insert_own
  ON public.virtual_knockout_predictions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS virtual_knockout_predictions_update_own ON public.virtual_knockout_predictions;
CREATE POLICY virtual_knockout_predictions_update_own
  ON public.virtual_knockout_predictions FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS virtual_knockout_predictions_delete_own ON public.virtual_knockout_predictions;
CREATE POLICY virtual_knockout_predictions_delete_own
  ON public.virtual_knockout_predictions FOR DELETE TO authenticated
  USING (user_id = auth.uid());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.virtual_knockout_predictions TO authenticated;
