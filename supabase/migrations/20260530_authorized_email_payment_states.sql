ALTER TABLE public.authorized_emails
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'confirmed',
  ADD COLUMN IF NOT EXISTS paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS trial_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS trial_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS disabled_at timestamptz,
  ADD COLUMN IF NOT EXISTS disabled_reason text;

ALTER TABLE public.authorized_emails
  DROP CONSTRAINT IF EXISTS authorized_emails_status_valid;

ALTER TABLE public.authorized_emails
  ADD CONSTRAINT authorized_emails_status_valid
  CHECK (status IN ('trial', 'confirmed', 'disabled'));

UPDATE public.authorized_emails
SET
  status = CASE
    WHEN deleted_at IS NOT NULL THEN 'disabled'
    WHEN active = true THEN 'confirmed'
    ELSE 'disabled'
  END,
  disabled_at = CASE
    WHEN active = false AND disabled_at IS NULL THEN coalesce(updated_at, now())
    ELSE disabled_at
  END
WHERE status IS NULL
   OR status NOT IN ('trial', 'confirmed', 'disabled')
   OR (active = false AND disabled_at IS NULL);

CREATE INDEX IF NOT EXISTS authorized_emails_status_idx
  ON public.authorized_emails (status);

CREATE INDEX IF NOT EXISTS authorized_emails_paid_at_idx
  ON public.authorized_emails (paid_at);

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
      AND ae.status IN ('trial', 'confirmed')
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
      AND status IN ('trial', 'confirmed')
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
  status text,
  paid_at timestamptz,
  trial_started_at timestamptz,
  trial_expires_at timestamptz,
  disabled_at timestamptz,
  disabled_reason text,
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
  SELECT
    ae.email,
    ae.label,
    ae.active,
    ae.status,
    ae.paid_at,
    ae.trial_started_at,
    ae.trial_expires_at,
    ae.disabled_at,
    ae.disabled_reason,
    ae.deleted_at,
    ae.created_at,
    ae.updated_at
  FROM public.authorized_emails ae
  WHERE v_query = ''
     OR ae.email ILIKE '%' || v_query || '%'
     OR coalesce(ae.label, '') ILIKE '%' || v_query || '%'
     OR coalesce(ae.disabled_reason, '') ILIKE '%' || v_query || '%'
  ORDER BY
    (ae.deleted_at IS NOT NULL) ASC,
    CASE ae.status
      WHEN 'confirmed' THEN 1
      WHEN 'trial' THEN 2
      WHEN 'disabled' THEN 3
      ELSE 4
    END ASC,
    ae.email ASC
  LIMIT 250;
END;
$$
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth;

DROP FUNCTION IF EXISTS public.admin_upsert_authorized_email(text, text, boolean);

CREATE FUNCTION public.admin_upsert_authorized_email(
  p_email text,
  p_label text DEFAULT NULL,
  p_active boolean DEFAULT true,
  p_status text DEFAULT 'trial',
  p_disabled_reason text DEFAULT NULL
) RETURNS void
AS $$
DECLARE
  v_email text := lower(trim(coalesce(p_email, '')));
  v_label text := nullif(trim(p_label), '');
  v_status text := coalesce(nullif(trim(p_status), ''), 'trial');
  v_disabled_reason text := nullif(trim(p_disabled_reason), '');
  v_active boolean := coalesce(p_active, true);
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

  IF v_status = 'disabled' THEN
    v_active := false;
  ELSE
    v_active := true;
  END IF;

  INSERT INTO public.authorized_emails (
    email,
    label,
    active,
    status,
    paid_at,
    trial_started_at,
    disabled_at,
    disabled_reason,
    deleted_at
  )
  VALUES (
    v_email,
    v_label,
    v_active,
    v_status,
    CASE WHEN v_status = 'confirmed' THEN now() ELSE NULL END,
    CASE WHEN v_status = 'trial' THEN now() ELSE NULL END,
    CASE WHEN v_status = 'disabled' THEN now() ELSE NULL END,
    CASE WHEN v_status = 'disabled' THEN v_disabled_reason ELSE NULL END,
    NULL
  )
  ON CONFLICT (email) DO UPDATE
  SET
    label = excluded.label,
    active = excluded.active,
    status = excluded.status,
    paid_at = CASE
      WHEN excluded.status = 'confirmed' THEN coalesce(public.authorized_emails.paid_at, now())
      ELSE NULL
    END,
    trial_started_at = CASE
      WHEN excluded.status = 'trial' THEN coalesce(public.authorized_emails.trial_started_at, now())
      ELSE public.authorized_emails.trial_started_at
    END,
    disabled_at = CASE
      WHEN excluded.status = 'disabled' THEN coalesce(public.authorized_emails.disabled_at, now())
      ELSE NULL
    END,
    disabled_reason = CASE
      WHEN excluded.status = 'disabled' THEN v_disabled_reason
      ELSE NULL
    END,
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
  v_active boolean := coalesce(p_active, false);
BEGIN
  IF NOT public.current_user_is_admin() THEN
    RAISE EXCEPTION 'Sin permisos de administrador';
  END IF;

  UPDATE public.authorized_emails
  SET active = v_active,
      status = CASE WHEN v_active THEN 'trial' ELSE 'disabled' END,
      paid_at = CASE WHEN v_active THEN NULL ELSE paid_at END,
      trial_started_at = CASE WHEN v_active THEN coalesce(trial_started_at, now()) ELSE trial_started_at END,
      disabled_at = CASE WHEN v_active THEN NULL ELSE coalesce(disabled_at, now()) END,
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
  AND ae.status = 'confirmed'
  AND ae.deleted_at IS NULL
LEFT JOIN public.predictions p ON p.user_id = pr.id
GROUP BY pr.id, pr.name, pr.avatar_url;

GRANT SELECT ON public.ranking_entries TO anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.admin_list_authorized_emails(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_upsert_authorized_email(text, text, boolean, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_set_authorized_email_active(text, boolean) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.admin_list_authorized_emails(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_upsert_authorized_email(text, text, boolean, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_authorized_email_active(text, boolean) TO authenticated;
