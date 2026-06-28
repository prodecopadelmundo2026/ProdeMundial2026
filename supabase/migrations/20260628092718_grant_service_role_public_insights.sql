-- Public prediction insights are computed server-side with the service-role
-- client. Version the production grants so fresh environments behave equally.
grant select on table public.predictions to service_role;
grant select on table public.user_prediction_tiebreakers to service_role;
grant select on table public.profiles to service_role;
grant select on table public.virtual_knockout_predictions to service_role;
