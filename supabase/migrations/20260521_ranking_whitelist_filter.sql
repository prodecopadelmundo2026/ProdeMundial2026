-- =============================================================
-- Fix: ranking_entries solo muestra usuarios en la whitelist activa
--
-- Problema: la view anterior listaba TODOS los profiles. Usuarios
-- que fueron removidos de authorized_emails (o que existían antes
-- de que se implementara el sistema de whitelist) seguían apareciendo
-- en el ranking aunque ya no tuvieran acceso a la app.
-- =============================================================

-- Diagnóstico: perfiles huérfanos (en profiles pero sin acceso activo)
-- Ejecutar antes de aplicar el fix para ver quiénes son:
--
-- SELECT pr.id, pr.email, pr.name, pr.created_at,
--        ae.email AS whitelist_email, ae.active
-- FROM public.profiles pr
-- LEFT JOIN public.authorized_emails ae ON ae.email = lower(trim(pr.email))
-- WHERE ae.email IS NULL OR ae.active = false
-- ORDER BY pr.created_at;

-- =============================================================
-- Fix: recrear ranking_entries con INNER JOIN a authorized_emails
-- =============================================================

DROP VIEW IF EXISTS public.ranking_entries;

CREATE VIEW public.ranking_entries
WITH (security_invoker = false) AS
SELECT
  pr.id AS user_id,
  pr.name,
  pr.avatar_url,
  COALESCE(SUM(p.points), 0)::int AS total_points,
  COUNT(*) FILTER (WHERE p.points = 3)::int AS exact_predictions,
  COUNT(*) FILTER (WHERE p.points = 1)::int AS correct_result_predictions,
  RANK() OVER (
    ORDER BY COALESCE(SUM(p.points), 0) DESC,
             COUNT(*) FILTER (WHERE p.points = 3) DESC,
             pr.created_at ASC
  )::int AS rank
FROM public.profiles pr
-- Solo usuarios con acceso activo en la whitelist
INNER JOIN public.authorized_emails ae
  ON ae.email = lower(trim(pr.email))
  AND ae.active = true
LEFT JOIN public.predictions p ON p.user_id = pr.id
GROUP BY pr.id, pr.name, pr.avatar_url, pr.created_at;

-- Mantener los grants existentes
GRANT SELECT ON public.ranking_entries TO anon, authenticated;
