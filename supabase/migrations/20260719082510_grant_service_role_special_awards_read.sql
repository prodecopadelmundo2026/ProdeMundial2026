-- Permite que el cliente server-side con service_role derive los premios especiales.
-- Solo otorga lectura; no modifica RLS ni permisos de usuarios anon/authenticated.

GRANT SELECT ON public.special_bets TO service_role;
GRANT SELECT ON public.players TO service_role;
GRANT SELECT ON public.special_bet_normalizations TO service_role;
GRANT SELECT ON public.special_bet_results TO service_role;
GRANT SELECT ON public.special_bet_result_winners TO service_role;
GRANT SELECT ON public.authorized_emails TO service_role;
