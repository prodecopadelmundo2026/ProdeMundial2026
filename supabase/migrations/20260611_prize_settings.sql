-- Editable prize settings for the public Home/Premios views.
-- The table stores a single current row. Public reads are allowed because the
-- values are displayed publicly; writes go through an admin-only RPC.

CREATE TABLE IF NOT EXISTS public.prize_settings (
  id text PRIMARY KEY DEFAULT 'current' CHECK (id = 'current'),
  first_prize int NOT NULL CHECK (first_prize >= 0),
  second_prize int NOT NULL CHECK (second_prize >= 0),
  third_prize int NOT NULL CHECK (third_prize >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL
);

ALTER TABLE public.prize_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Prize settings are publicly readable" ON public.prize_settings;
CREATE POLICY "Prize settings are publicly readable"
  ON public.prize_settings
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Only admins can insert prize settings" ON public.prize_settings;
CREATE POLICY "Only admins can insert prize settings"
  ON public.prize_settings
  FOR INSERT
  WITH CHECK (public.current_user_is_admin());

DROP POLICY IF EXISTS "Only admins can update prize settings" ON public.prize_settings;
CREATE POLICY "Only admins can update prize settings"
  ON public.prize_settings
  FOR UPDATE
  USING (public.current_user_is_admin())
  WITH CHECK (public.current_user_is_admin());

CREATE OR REPLACE FUNCTION public.get_public_prize_settings()
RETURNS TABLE (
  first_prize int,
  second_prize int,
  third_prize int,
  updated_at timestamptz,
  updated_by uuid
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ps.first_prize, ps.second_prize, ps.third_prize, ps.updated_at, ps.updated_by
  FROM public.prize_settings ps
  WHERE ps.id = 'current'
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_prize_settings(
  p_first_prize int,
  p_second_prize int,
  p_third_prize int
)
RETURNS TABLE (
  first_prize int,
  second_prize int,
  third_prize int,
  updated_at timestamptz,
  updated_by uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF NOT public.current_user_is_admin() THEN
    RAISE EXCEPTION 'Sin permisos de administrador';
  END IF;

  IF p_first_prize IS NULL OR p_second_prize IS NULL OR p_third_prize IS NULL THEN
    RAISE EXCEPTION 'Los premios son obligatorios';
  END IF;

  IF p_first_prize < 0 OR p_second_prize < 0 OR p_third_prize < 0 THEN
    RAISE EXCEPTION 'Los premios no pueden ser negativos';
  END IF;

  IF p_first_prize < p_second_prize OR p_second_prize < p_third_prize THEN
    RAISE EXCEPTION 'El primer premio debe ser mayor o igual al segundo, y el segundo mayor o igual al tercero';
  END IF;

  INSERT INTO public.prize_settings (id, first_prize, second_prize, third_prize, updated_at, updated_by)
  VALUES ('current', p_first_prize, p_second_prize, p_third_prize, now(), auth.uid())
  ON CONFLICT (id) DO UPDATE
  SET first_prize = excluded.first_prize,
      second_prize = excluded.second_prize,
      third_prize = excluded.third_prize,
      updated_at = now(),
      updated_by = auth.uid();

  RETURN QUERY
  SELECT ps.first_prize, ps.second_prize, ps.third_prize, ps.updated_at, ps.updated_by
  FROM public.prize_settings ps
  WHERE ps.id = 'current';
END;
$$;

GRANT SELECT ON public.prize_settings TO anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_set_prize_settings(int, int, int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_public_prize_settings() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_prize_settings(int, int, int) TO authenticated;
