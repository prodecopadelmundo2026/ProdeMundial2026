CREATE OR REPLACE FUNCTION public.admin_set_authorized_email_status(
  p_email text,
  p_status text,
  p_disabled_reason text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_email text := lower(trim(coalesce(p_email, '')));
  v_status text := lower(trim(coalesce(p_status, '')));
  v_disabled_reason text := nullif(trim(p_disabled_reason), '');
BEGIN
  IF NOT public.current_user_is_admin() THEN
    RAISE EXCEPTION 'Sin permisos de administrador';
  END IF;

  IF v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RAISE EXCEPTION 'Email invalido';
  END IF;

  IF v_status NOT IN ('trial', 'confirmed', 'disabled') THEN
    RAISE EXCEPTION 'Estado invalido';
  END IF;

  UPDATE public.authorized_emails
  SET
    active = v_status IN ('trial', 'confirmed'),
    status = v_status,
    paid_at = CASE
      WHEN v_status = 'confirmed' THEN coalesce(paid_at, now())
      ELSE NULL
    END,
    trial_started_at = CASE
      WHEN v_status = 'trial' THEN coalesce(trial_started_at, now())
      ELSE trial_started_at
    END,
    disabled_at = CASE
      WHEN v_status = 'disabled' THEN coalesce(disabled_at, now())
      ELSE NULL
    END,
    disabled_reason = CASE
      WHEN v_status = 'disabled' THEN v_disabled_reason
      ELSE NULL
    END,
    deleted_at = NULL,
    updated_at = now()
  WHERE email = v_email;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Email no encontrado';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_update_authorized_email(
  p_original_email text,
  p_email text,
  p_label text DEFAULT NULL,
  p_status text DEFAULT 'trial',
  p_disabled_reason text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_original_email text := lower(trim(coalesce(p_original_email, '')));
  v_email text := lower(trim(coalesce(p_email, '')));
  v_label text := nullif(trim(p_label), '');
  v_status text := lower(trim(coalesce(p_status, 'trial')));
  v_disabled_reason text := nullif(trim(p_disabled_reason), '');
BEGIN
  IF NOT public.current_user_is_admin() THEN
    RAISE EXCEPTION 'Sin permisos de administrador';
  END IF;

  IF v_original_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RAISE EXCEPTION 'Email original invalido';
  END IF;

  IF v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RAISE EXCEPTION 'Email invalido';
  END IF;

  IF v_status NOT IN ('trial', 'confirmed', 'disabled') THEN
    RAISE EXCEPTION 'Estado invalido';
  END IF;

  IF v_email <> v_original_email AND EXISTS (
    SELECT 1 FROM public.authorized_emails WHERE email = v_email
  ) THEN
    RAISE EXCEPTION 'Ya existe un participante habilitado con ese email.';
  END IF;

  UPDATE public.authorized_emails
  SET
    email = v_email,
    label = v_label,
    active = v_status IN ('trial', 'confirmed'),
    status = v_status,
    paid_at = CASE
      WHEN v_status = 'confirmed' THEN coalesce(paid_at, now())
      ELSE NULL
    END,
    trial_started_at = CASE
      WHEN v_status = 'trial' THEN coalesce(trial_started_at, now())
      ELSE trial_started_at
    END,
    disabled_at = CASE
      WHEN v_status = 'disabled' THEN coalesce(disabled_at, now())
      ELSE NULL
    END,
    disabled_reason = CASE
      WHEN v_status = 'disabled' THEN v_disabled_reason
      ELSE NULL
    END,
    deleted_at = NULL,
    updated_at = now()
  WHERE email = v_original_email;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Email no encontrado';
  END IF;

  UPDATE public.profiles
  SET
    email = v_email,
    name = coalesce(v_label, name),
    updated_at = now()
  WHERE lower(trim(email)) = v_original_email;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_soft_delete_authorized_email(
  p_email text
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

  IF v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RAISE EXCEPTION 'Email invalido';
  END IF;

  UPDATE public.authorized_emails
  SET
    active = false,
    status = 'disabled',
    disabled_at = coalesce(disabled_at, now()),
    deleted_at = now(),
    updated_at = now()
  WHERE email = v_email;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Email no encontrado';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_restore_authorized_email(
  p_email text,
  p_status text DEFAULT 'trial'
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_email text := lower(trim(coalesce(p_email, '')));
  v_status text := lower(trim(coalesce(p_status, 'trial')));
BEGIN
  IF NOT public.current_user_is_admin() THEN
    RAISE EXCEPTION 'Sin permisos de administrador';
  END IF;

  IF v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RAISE EXCEPTION 'Email invalido';
  END IF;

  IF v_status NOT IN ('trial', 'confirmed', 'disabled') THEN
    RAISE EXCEPTION 'Estado invalido';
  END IF;

  UPDATE public.authorized_emails
  SET
    active = v_status IN ('trial', 'confirmed'),
    status = v_status,
    paid_at = CASE
      WHEN v_status = 'confirmed' THEN coalesce(paid_at, now())
      ELSE NULL
    END,
    trial_started_at = CASE
      WHEN v_status = 'trial' THEN coalesce(trial_started_at, now())
      ELSE trial_started_at
    END,
    disabled_at = CASE
      WHEN v_status = 'disabled' THEN coalesce(disabled_at, now())
      ELSE NULL
    END,
    disabled_reason = CASE
      WHEN v_status = 'disabled' THEN disabled_reason
      ELSE NULL
    END,
    deleted_at = NULL,
    updated_at = now()
  WHERE email = v_email;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Email no encontrado';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_authorized_email_login_state(
  p_email text
) RETURNS TABLE (
  exists_in_whitelist boolean,
  active boolean,
  status text,
  deleted_at timestamptz,
  disabled_reason text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_email text := lower(trim(coalesce(p_email, '')));
BEGIN
  RETURN QUERY
  SELECT
    true,
    ae.active,
    ae.status,
    ae.deleted_at,
    ae.disabled_reason
  FROM public.authorized_emails ae
  WHERE ae.email = v_email
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, false, NULL::text, NULL::timestamptz, NULL::text;
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_set_authorized_email_status(text, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_update_authorized_email(text, text, text, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_soft_delete_authorized_email(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_restore_authorized_email(text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_authorized_email_login_state(text) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.admin_set_authorized_email_status(text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_authorized_email(text, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_soft_delete_authorized_email(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_restore_authorized_email(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_authorized_email_login_state(text) TO authenticated;
