-- =============================================================
-- Admin management for email whitelist
-- =============================================================

INSERT INTO public.authorized_emails (email, label, active)
VALUES ('prodecopadelmundo2026@gmail.com', 'Admin Prode Mundial 2026', true)
ON CONFLICT (email) DO UPDATE
SET active = true,
    label = coalesce(public.authorized_emails.label, excluded.label),
    updated_at = now();

UPDATE public.profiles
SET is_admin = true, updated_at = now()
WHERE lower(trim(email)) = 'prodecopadelmundo2026@gmail.com';

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
  ) THEN
    RAISE EXCEPTION 'Email no autorizado';
  END IF;

  INSERT INTO public.profiles (id, email, name, avatar_url, is_admin)
  VALUES (
    v_user_id,
    v_email,
    v_name,
    v_avatar_url,
    v_email = 'prodecopadelmundo2026@gmail.com'
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = excluded.email,
    name = excluded.name,
    avatar_url = excluded.avatar_url,
    is_admin = public.profiles.is_admin OR excluded.is_admin,
    updated_at = now();
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_list_authorized_emails(
  p_query text DEFAULT NULL
) RETURNS TABLE (
  email text,
  label text,
  active boolean,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_query text := lower(trim(coalesce(p_query, '')));
BEGIN
  IF NOT public.current_user_is_admin() THEN
    RAISE EXCEPTION 'Sin permisos de administrador';
  END IF;

  RETURN QUERY
  SELECT ae.email, ae.label, ae.active, ae.created_at, ae.updated_at
  FROM public.authorized_emails ae
  WHERE v_query = ''
     OR ae.email ILIKE '%' || v_query || '%'
     OR coalesce(ae.label, '') ILIKE '%' || v_query || '%'
  ORDER BY ae.active DESC, ae.email ASC
  LIMIT 250;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_upsert_authorized_email(
  p_email text,
  p_label text DEFAULT NULL,
  p_active boolean DEFAULT true
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
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

  INSERT INTO public.authorized_emails (email, label, active)
  VALUES (v_email, v_label, coalesce(p_active, true))
  ON CONFLICT (email) DO UPDATE
  SET
    label = excluded.label,
    active = excluded.active,
    updated_at = now();
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_authorized_email_active(
  p_email text,
  p_active boolean
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_email text := lower(trim(coalesce(p_email, '')));
BEGIN
  IF NOT public.current_user_is_admin() THEN
    RAISE EXCEPTION 'Sin permisos de administrador';
  END IF;

  UPDATE public.authorized_emails
  SET active = p_active, updated_at = now()
  WHERE email = v_email;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Email no encontrado';
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_list_authorized_emails(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_upsert_authorized_email(text, text, boolean) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_set_authorized_email_active(text, boolean) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.admin_list_authorized_emails(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_upsert_authorized_email(text, text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_authorized_email_active(text, boolean) TO authenticated;
