-- Soft-delete lifecycle for participants.
-- A disabled or deleted participant keeps historical predictions and audit data.

ALTER TABLE public.authorized_emails
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

CREATE INDEX IF NOT EXISTS authorized_emails_deleted_at_idx
  ON public.authorized_emails (deleted_at);

CREATE OR REPLACE FUNCTION public.current_user_has_access()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.authorized_emails ae
    WHERE ae.email = lower(trim(coalesce(auth.jwt() ->> 'email', '')))
      AND ae.active = true
      AND ae.deleted_at IS NULL
  );
$$;

CREATE OR REPLACE FUNCTION public.complete_google_sign_in(
  p_name text DEFAULT NULL,
  p_avatar_url text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_email text := lower(trim(coalesce(auth.jwt() ->> 'email', '')));
  v_name text := left(coalesce(nullif(trim(p_name), ''), 'Jugador'), 80);
  v_avatar_url text := nullif(trim(p_avatar_url), '');
BEGIN
  IF v_user_id IS NULL OR v_email = '' THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.authorized_emails
    WHERE email = v_email
      AND active = true
      AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Email no autorizado';
  END IF;

  INSERT INTO public.profiles (id, email, name, avatar_url)
  VALUES (v_user_id, v_email, v_name, v_avatar_url)
  ON CONFLICT (id) DO UPDATE
  SET
    email = excluded.email,
    name = excluded.name,
    avatar_url = excluded.avatar_url,
    updated_at = now();
END;
$$;

DROP FUNCTION IF EXISTS public.admin_list_authorized_emails(text);

CREATE FUNCTION public.admin_list_authorized_emails(
  p_query text DEFAULT NULL
) RETURNS TABLE (
  email text,
  label text,
  active boolean,
  deleted_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
)
AS $$
DECLARE
  v_query text := lower(trim(coalesce(p_query, '')));
BEGIN
  IF NOT public.current_user_is_admin() THEN
    RAISE EXCEPTION 'Sin permisos de administrador';
  END IF;

  RETURN QUERY
  SELECT ae.email, ae.label, ae.active, ae.deleted_at, ae.created_at, ae.updated_at
  FROM public.authorized_emails ae
  WHERE v_query = ''
     OR ae.email ILIKE '%' || v_query || '%'
     OR coalesce(ae.label, '') ILIKE '%' || v_query || '%'
  ORDER BY
    (ae.deleted_at IS NOT NULL) ASC,
    ae.active DESC,
    ae.email ASC
  LIMIT 250;
END;
$$
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth;

CREATE OR REPLACE FUNCTION public.admin_upsert_authorized_email(
  p_email text,
  p_label text DEFAULT NULL,
  p_active boolean DEFAULT true
) RETURNS void
AS $$
DECLARE
  v_email text := lower(trim(coalesce(p_email, '')));
  v_label text := nullif(trim(p_label), '');
BEGIN
  IF NOT public.current_user_is_admin() THEN
    RAISE EXCEPTION 'Sin permisos de administrador';
  END IF;

  IF v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RAISE EXCEPTION 'Email invalido';
  END IF;

  INSERT INTO public.authorized_emails (email, label, active, deleted_at)
  VALUES (v_email, v_label, coalesce(p_active, true), NULL)
  ON CONFLICT (email) DO UPDATE
  SET
    label = excluded.label,
    active = excluded.active,
    deleted_at = NULL,
    updated_at = now();
END;
$$
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth;

CREATE OR REPLACE FUNCTION public.admin_set_authorized_email_active(
  p_email text,
  p_active boolean
) RETURNS void
AS $$
DECLARE
  v_email text := lower(trim(coalesce(p_email, '')));
BEGIN
  IF NOT public.current_user_is_admin() THEN
    RAISE EXCEPTION 'Sin permisos de administrador';
  END IF;

  UPDATE public.authorized_emails
  SET active = p_active,
      deleted_at = NULL,
      updated_at = now()
  WHERE email = v_email;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Email no encontrado';
  END IF;
END;
$$
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth;

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
             COUNT(*) FILTER (WHERE p.points = 1) DESC
  )::int AS rank
FROM public.profiles pr
INNER JOIN public.authorized_emails ae
  ON ae.email = lower(trim(pr.email))
  AND ae.active = true
  AND ae.deleted_at IS NULL
LEFT JOIN public.predictions p ON p.user_id = pr.id
GROUP BY pr.id, pr.name, pr.avatar_url;

GRANT SELECT ON public.ranking_entries TO anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.admin_list_authorized_emails(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_upsert_authorized_email(text, text, boolean) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_set_authorized_email_active(text, boolean) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.admin_list_authorized_emails(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_upsert_authorized_email(text, text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_authorized_email_active(text, boolean) TO authenticated;
