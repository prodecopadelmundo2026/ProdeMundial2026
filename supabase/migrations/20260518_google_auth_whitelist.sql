-- =============================================================
-- Google OAuth + email whitelist
-- =============================================================

CREATE TABLE IF NOT EXISTS public.authorized_emails (
  email      text        PRIMARY KEY CHECK (email = lower(trim(email)) AND email LIKE '%@%'),
  label      text,
  active     boolean     NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_authorized_emails_updated_at
BEFORE UPDATE ON public.authorized_emails
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.authorized_emails (email, label, active)
SELECT lower(trim(email)), max(name), true
FROM public.profiles
WHERE nullif(trim(email), '') IS NOT NULL
GROUP BY lower(trim(email))
ON CONFLICT (email) DO NOTHING;

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

ALTER TABLE public.authorized_emails ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.authorized_emails FROM anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.current_user_has_access() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.complete_google_sign_in(text, text) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.current_user_has_access() TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_google_sign_in(text, text) TO authenticated;
