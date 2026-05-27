CREATE OR REPLACE FUNCTION public.current_user_is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.is_admin = true
  );
$$;

GRANT EXECUTE ON FUNCTION public.current_user_is_admin() TO authenticated;

CREATE TABLE IF NOT EXISTS public.user_prediction_tiebreakers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tiebreaker_key text NOT NULL,
  team text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_prediction_tiebreakers_key_valid
    CHECK (length(trim(tiebreaker_key)) BETWEEN 1 AND 160),
  CONSTRAINT user_prediction_tiebreakers_team_valid
    CHECK (length(trim(team)) BETWEEN 1 AND 220),
  CONSTRAINT user_prediction_tiebreakers_unique_user_key
    UNIQUE (user_id, tiebreaker_key)
);

CREATE INDEX IF NOT EXISTS user_prediction_tiebreakers_user_id_idx
  ON public.user_prediction_tiebreakers (user_id);

DROP TRIGGER IF EXISTS trg_user_prediction_tiebreakers_updated_at ON public.user_prediction_tiebreakers;
CREATE TRIGGER trg_user_prediction_tiebreakers_updated_at
BEFORE UPDATE ON public.user_prediction_tiebreakers
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.user_prediction_tiebreakers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_prediction_tiebreakers_select_own_or_admin ON public.user_prediction_tiebreakers;
CREATE POLICY user_prediction_tiebreakers_select_own_or_admin
  ON public.user_prediction_tiebreakers FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.current_user_is_admin());

DROP POLICY IF EXISTS user_prediction_tiebreakers_insert_own ON public.user_prediction_tiebreakers;
CREATE POLICY user_prediction_tiebreakers_insert_own
  ON public.user_prediction_tiebreakers FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS user_prediction_tiebreakers_update_own ON public.user_prediction_tiebreakers;
CREATE POLICY user_prediction_tiebreakers_update_own
  ON public.user_prediction_tiebreakers FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS user_prediction_tiebreakers_delete_own ON public.user_prediction_tiebreakers;
CREATE POLICY user_prediction_tiebreakers_delete_own
  ON public.user_prediction_tiebreakers FOR DELETE TO authenticated
  USING (user_id = auth.uid());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_prediction_tiebreakers TO authenticated;

INSERT INTO public.app_settings (key, value)
VALUES ('maintenance_mode', 'off')
ON CONFLICT (key) DO NOTHING;

DROP POLICY IF EXISTS app_settings_read_anon ON public.app_settings;
CREATE POLICY app_settings_read_anon
  ON public.app_settings FOR SELECT TO anon
  USING (true);

GRANT SELECT ON public.app_settings TO anon;
