CREATE TABLE IF NOT EXISTS public.app_settings (
  key text PRIMARY KEY,
  value text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.special_bets (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  balon text,
  bota text,
  guante text,
  points int,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.special_bets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS app_settings_read_authenticated ON public.app_settings;
CREATE POLICY app_settings_read_authenticated
  ON public.app_settings FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS app_settings_admin_write ON public.app_settings;
CREATE POLICY app_settings_admin_write
  ON public.app_settings FOR ALL TO authenticated
  USING (public.current_user_is_admin())
  WITH CHECK (public.current_user_is_admin());

DROP POLICY IF EXISTS special_bets_select_own_or_admin ON public.special_bets;
CREATE POLICY special_bets_select_own_or_admin
  ON public.special_bets FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.current_user_is_admin());

DROP POLICY IF EXISTS special_bets_insert_own ON public.special_bets;
CREATE POLICY special_bets_insert_own
  ON public.special_bets FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS special_bets_update_own ON public.special_bets;
CREATE POLICY special_bets_update_own
  ON public.special_bets FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS special_bets_delete_own ON public.special_bets;
CREATE POLICY special_bets_delete_own
  ON public.special_bets FOR DELETE TO authenticated
  USING (user_id = auth.uid());

GRANT SELECT ON public.app_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.special_bets TO authenticated;
