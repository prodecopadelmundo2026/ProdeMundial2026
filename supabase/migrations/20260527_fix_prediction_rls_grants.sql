ALTER TABLE public.predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.virtual_knockout_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_prediction_tiebreakers ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.predictions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.virtual_knockout_predictions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_prediction_tiebreakers TO authenticated;

DROP POLICY IF EXISTS "predictions: read all" ON public.predictions;
DROP POLICY IF EXISTS "predictions: read own" ON public.predictions;
DROP POLICY IF EXISTS "predictions: insert own" ON public.predictions;
DROP POLICY IF EXISTS "predictions: update own" ON public.predictions;
DROP POLICY IF EXISTS predictions_select_own ON public.predictions;
DROP POLICY IF EXISTS predictions_insert_own_open_match ON public.predictions;
DROP POLICY IF EXISTS predictions_update_own_open_match ON public.predictions;
CREATE POLICY predictions_select_own
  ON public.predictions FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS predictions_insert_own ON public.predictions;
CREATE POLICY predictions_insert_own
  ON public.predictions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS predictions_update_own ON public.predictions;
CREATE POLICY predictions_update_own
  ON public.predictions FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS predictions_delete_own ON public.predictions;
CREATE POLICY predictions_delete_own
  ON public.predictions FOR DELETE TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS virtual_knockout_predictions_select_own_or_admin ON public.virtual_knockout_predictions;
DROP POLICY IF EXISTS virtual_knockout_predictions_select_own ON public.virtual_knockout_predictions;
CREATE POLICY virtual_knockout_predictions_select_own
  ON public.virtual_knockout_predictions FOR SELECT TO authenticated
  USING (user_id = auth.uid());

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

DROP POLICY IF EXISTS user_prediction_tiebreakers_select_own_or_admin ON public.user_prediction_tiebreakers;
DROP POLICY IF EXISTS user_prediction_tiebreakers_select_own ON public.user_prediction_tiebreakers;
CREATE POLICY user_prediction_tiebreakers_select_own
  ON public.user_prediction_tiebreakers FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS user_prediction_tiebreakers_insert_own ON public.user_prediction_tiebreakers;
CREATE POLICY user_prediction_tiebreakers_insert_own
  ON public.user_prediction_tiebreakers FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS user_prediction_tiebreakers_update_own ON public.user_prediction_tiebreakers;
CREATE POLICY user_prediction_tiebreakers_update_own
  ON public.user_prediction_tiebreakers FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS user_prediction_tiebreakers_delete_own ON public.user_prediction_tiebreakers;
CREATE POLICY user_prediction_tiebreakers_delete_own
  ON public.user_prediction_tiebreakers FOR DELETE TO authenticated
  USING (user_id = auth.uid());
