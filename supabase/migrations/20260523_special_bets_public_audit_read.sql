-- Allow authenticated users to audit visible special bets from ranking detail.
-- Writes remain restricted to the owner by the existing insert/update/delete policies.

DROP POLICY IF EXISTS special_bets_select_own_or_admin ON public.special_bets;
DROP POLICY IF EXISTS special_bets_select_authenticated ON public.special_bets;

CREATE POLICY special_bets_select_authenticated
  ON public.special_bets FOR SELECT TO authenticated
  USING (true);

GRANT SELECT ON public.special_bets TO authenticated;
