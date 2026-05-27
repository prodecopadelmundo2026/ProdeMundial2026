-- Allow authenticated users to read all predictions for public ranking audit.
-- Writes remain restricted to the owner by the existing insert/update/delete policies.
-- Mirrors the pattern already applied to special_bets in 20260523_special_bets_public_audit_read.sql.

DROP POLICY IF EXISTS predictions_select_own ON public.predictions;
CREATE POLICY predictions_select_all
  ON public.predictions FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS virtual_knockout_predictions_select_own ON public.virtual_knockout_predictions;
CREATE POLICY virtual_knockout_predictions_select_all
  ON public.virtual_knockout_predictions FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS user_prediction_tiebreakers_select_own ON public.user_prediction_tiebreakers;
CREATE POLICY user_prediction_tiebreakers_select_all
  ON public.user_prediction_tiebreakers FOR SELECT TO authenticated
  USING (true);
