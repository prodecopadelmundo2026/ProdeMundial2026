-- Internal poll for the knockout trajectory bonus proposal.
-- This only records votes and proposed values; it does not affect scoring.

CREATE TABLE IF NOT EXISTS public.polls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  description text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed')),
  closes_at timestamptz NOT NULL,
  allow_vote_changes boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.poll_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id uuid NOT NULL REFERENCES public.polls(id) ON DELETE CASCADE,
  option_key text NOT NULL,
  label text NOT NULL,
  description text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (poll_id, option_key)
);

CREATE TABLE IF NOT EXISTS public.poll_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id uuid NOT NULL REFERENCES public.polls(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  option_id uuid NOT NULL REFERENCES public.poll_options(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (poll_id, user_id)
);

CREATE INDEX IF NOT EXISTS poll_options_poll_id_sort_order_idx
  ON public.poll_options (poll_id, sort_order);

CREATE INDEX IF NOT EXISTS poll_votes_poll_id_option_id_idx
  ON public.poll_votes (poll_id, option_id);

CREATE INDEX IF NOT EXISTS poll_votes_user_id_idx
  ON public.poll_votes (user_id);

DROP TRIGGER IF EXISTS trg_polls_updated_at ON public.polls;
CREATE TRIGGER trg_polls_updated_at
BEFORE UPDATE ON public.polls
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_poll_votes_updated_at ON public.poll_votes;
CREATE TRIGGER trg_poll_votes_updated_at
BEFORE UPDATE ON public.poll_votes
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "polls_select_authenticated" ON public.polls;
CREATE POLICY "polls_select_authenticated"
  ON public.polls FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "poll_options_select_authenticated" ON public.poll_options;
CREATE POLICY "poll_options_select_authenticated"
  ON public.poll_options FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "poll_votes_select_own" ON public.poll_votes;
CREATE POLICY "poll_votes_select_own"
  ON public.poll_votes FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

REVOKE ALL ON public.polls FROM anon, authenticated;
REVOKE ALL ON public.poll_options FROM anon, authenticated;
REVOKE ALL ON public.poll_votes FROM anon, authenticated;
GRANT SELECT ON public.polls TO authenticated;
GRANT SELECT ON public.poll_options TO authenticated;
GRANT SELECT ON public.poll_votes TO authenticated;

INSERT INTO public.polls (slug, title, description, status, closes_at, allow_vote_changes, metadata)
VALUES (
  'knockout-trajectory-bonus',
  'Bonus de trayectoria en eliminatorias',
  'Consulta interna para decidir si agregamos puntos extra por acertar equipos que avanzan de fase, aunque no coincida todo el cruce exacto.',
  'active',
  '2026-06-27 12:00:00-03'::timestamptz,
  true,
  jsonb_build_object(
    'proposal', jsonb_build_array(
      jsonb_build_object('stage', '16avos', 'points', 1),
      jsonb_build_object('stage', '8avos', 'points', 2),
      jsonb_build_object('stage', '4tos', 'points', 3),
      jsonb_build_object('stage', 'Semis', 'points', 4),
      jsonb_build_object('stage', 'Final', 'points', 5),
      jsonb_build_object('stage', 'Campeón', 'points', 10)
    ),
    'deadlineLabel', 'sábado 12:00 hs',
    'noticeTitle', 'La votación se define antes del domingo',
    'noticeText', 'Necesitamos cerrarla antes de que termine la fase de grupos.'
  )
)
ON CONFLICT (slug) DO UPDATE
SET
  title = excluded.title,
  description = excluded.description,
  closes_at = excluded.closes_at,
  allow_vote_changes = excluded.allow_vote_changes,
  metadata = excluded.metadata,
  updated_at = now();

UPDATE public.polls
SET
  closes_at = '2026-06-27 12:00:00-03'::timestamptz,
  allow_vote_changes = true,
  metadata = metadata || jsonb_build_object(
    'deadlineLabel', 'sábado 12:00 hs',
    'noticeTitle', 'La votación cierra el sábado a las 12:00 hs',
    'noticeText', 'Hasta ese momento podés votar o cambiar tu voto.'
  ),
  updated_at = now()
WHERE slug = 'knockout-trajectory-bonus';

WITH target_poll AS (
  SELECT id FROM public.polls WHERE slug = 'knockout-trajectory-bonus'
)
INSERT INTO public.poll_options (poll_id, option_key, label, description, sort_order)
SELECT target_poll.id, option_key, label, description, sort_order
FROM target_poll
CROSS JOIN (
  VALUES
    ('yes', 'Sí, me gusta', 'Agregar el bonus de trayectoria', 1),
    ('no', 'No, prefiero el sistema actual', 'Mantener la puntuación original', 2),
    ('neutral', 'Me da igual / lo define la organización', 'Acepto cualquiera de las dos decisiones', 3)
) AS options(option_key, label, description, sort_order)
ON CONFLICT (poll_id, option_key) DO UPDATE
SET
  label = excluded.label,
  description = excluded.description,
  sort_order = excluded.sort_order;

CREATE OR REPLACE FUNCTION public.get_poll_state(p_poll_slug text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  WITH selected_poll AS (
    SELECT *
    FROM public.polls
    WHERE slug = p_poll_slug
    LIMIT 1
  ),
  poll_status AS (
    SELECT
      selected_poll.*,
      (selected_poll.status = 'active' AND now() < selected_poll.closes_at) AS is_open
    FROM selected_poll
  ),
  eligible_voters AS (
    SELECT
      pr.id AS user_id,
      ae.email,
      COALESCE(NULLIF(pr.name, ''), NULLIF(ae.label, ''), split_part(ae.email, '@', 1), 'Participante') AS name
    FROM public.authorized_emails ae
    LEFT JOIN public.profiles pr
      ON lower(trim(pr.email)) = lower(trim(ae.email))
    WHERE ae.active = true
      AND ae.deleted_at IS NULL
      AND ae.status = 'confirmed'
  ),
  current_user_eligible AS (
    SELECT EXISTS (
      SELECT 1
      FROM eligible_voters ev
      WHERE ev.user_id = (SELECT auth.uid())
    ) AS value
  ),
  current_vote AS (
    SELECT
      po.option_key,
      po.label,
      po.description
    FROM poll_status ps
    INNER JOIN public.poll_votes pv ON pv.poll_id = ps.id
    INNER JOIN public.poll_options po ON po.id = pv.option_id
    WHERE pv.user_id = (SELECT auth.uid())
    LIMIT 1
  ),
  options AS (
    SELECT
      po.id,
      po.option_key,
      po.label,
      po.description,
      po.sort_order,
      COUNT(pv.id)::int AS votes_count
    FROM poll_status ps
    INNER JOIN public.poll_options po ON po.poll_id = ps.id
    LEFT JOIN public.poll_votes pv ON pv.option_id = po.id
    GROUP BY po.id, po.option_key, po.label, po.description, po.sort_order
  ),
  voters_by_option AS (
    SELECT
      options.option_key,
      options.label,
      options.sort_order,
      COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'userId', ev.user_id,
            'name', ev.name
          )
          ORDER BY ev.name
        ) FILTER (WHERE ev.user_id IS NOT NULL),
        '[]'::jsonb
      ) AS voters
    FROM options
    LEFT JOIN public.poll_votes pv ON pv.option_id = options.id
    LEFT JOIN eligible_voters ev ON ev.user_id = pv.user_id
    GROUP BY options.option_key, options.label, options.sort_order
  ),
  pending_voters AS (
    SELECT
      ev.user_id,
      ev.email,
      ev.name
    FROM eligible_voters ev
    CROSS JOIN poll_status ps
    LEFT JOIN public.poll_votes pv
      ON pv.poll_id = ps.id
      AND pv.user_id = ev.user_id
    WHERE pv.id IS NULL
    ORDER BY ev.name
  )
  SELECT CASE
    WHEN NOT EXISTS (SELECT 1 FROM poll_status) THEN NULL::jsonb
    WHEN NOT (SELECT value FROM current_user_eligible) THEN NULL::jsonb
    ELSE jsonb_build_object(
      'poll', jsonb_build_object(
        'id', (SELECT id FROM poll_status),
        'slug', (SELECT slug FROM poll_status),
        'title', (SELECT title FROM poll_status),
        'description', (SELECT description FROM poll_status),
        'status', (SELECT status FROM poll_status),
        'closesAt', (SELECT closes_at FROM poll_status),
        'isOpen', (SELECT is_open FROM poll_status),
        'metadata', (SELECT metadata FROM poll_status)
      ),
      'options', COALESCE(
        (
          SELECT jsonb_agg(
            jsonb_build_object(
              'key', option_key,
              'label', label,
              'description', description,
              'sortOrder', sort_order,
              'votesCount', votes_count
            )
            ORDER BY sort_order
          )
          FROM options
        ),
        '[]'::jsonb
      ),
      'vote', (
        SELECT CASE
          WHEN EXISTS (SELECT 1 FROM current_vote) THEN jsonb_build_object(
            'optionKey', (SELECT option_key FROM current_vote),
            'label', (SELECT label FROM current_vote),
            'description', (SELECT description FROM current_vote)
          )
          ELSE NULL::jsonb
        END
      ),
      'canVote', (
        SELECT value
        FROM current_user_eligible
      ) AND (SELECT is_open FROM poll_status),
      'totalVoters', (SELECT COUNT(*)::int FROM eligible_voters),
      'totalVotes', (
        SELECT COUNT(*)::int
        FROM poll_status ps
        INNER JOIN public.poll_votes pv ON pv.poll_id = ps.id
      ),
      'pendingCount', (SELECT COUNT(*)::int FROM pending_voters),
      'votersByOption', COALESCE(
        (
          SELECT jsonb_agg(
            jsonb_build_object(
              'key', option_key,
              'label', label,
              'voters', voters
            )
            ORDER BY sort_order
          )
          FROM voters_by_option
        ),
        '[]'::jsonb
      ),
      'pendingVoters', COALESCE(
        (
          SELECT jsonb_agg(
            jsonb_build_object(
              'userId', user_id,
              'name', name
            )
            ORDER BY name
          )
          FROM pending_voters
        ),
        '[]'::jsonb
      )
    )
  END;
$$;

CREATE OR REPLACE FUNCTION public.submit_poll_vote(
  p_poll_slug text,
  p_option_key text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_poll public.polls%ROWTYPE;
  v_option public.poll_options%ROWTYPE;
  v_existing public.poll_votes%ROWTYPE;
  v_is_eligible boolean;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.profiles pr
    INNER JOIN public.authorized_emails ae
      ON lower(trim(ae.email)) = lower(trim(pr.email))
    WHERE pr.id = v_user_id
      AND ae.active = true
      AND ae.deleted_at IS NULL
      AND ae.status = 'confirmed'
  ) INTO v_is_eligible;

  IF NOT v_is_eligible THEN
    RAISE EXCEPTION 'Solo los competidores confirmados pueden votar';
  END IF;

  SELECT * INTO v_poll
  FROM public.polls
  WHERE slug = p_poll_slug
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Votación no encontrada';
  END IF;

  IF v_poll.status <> 'active' OR now() >= v_poll.closes_at THEN
    RAISE EXCEPTION 'La votación ya está cerrada';
  END IF;

  SELECT * INTO v_option
  FROM public.poll_options
  WHERE poll_id = v_poll.id
    AND option_key = p_option_key
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Opción inválida';
  END IF;

  SELECT * INTO v_existing
  FROM public.poll_votes
  WHERE poll_id = v_poll.id
    AND user_id = v_user_id
  LIMIT 1;

  IF FOUND AND NOT v_poll.allow_vote_changes THEN
    RAISE EXCEPTION 'Ya registramos tu voto';
  END IF;

  IF FOUND THEN
    UPDATE public.poll_votes
    SET option_id = v_option.id,
        updated_at = now()
    WHERE id = v_existing.id;
  ELSE
    INSERT INTO public.poll_votes (poll_id, user_id, option_id)
    VALUES (v_poll.id, v_user_id, v_option.id);
  END IF;

  RETURN public.get_poll_state(p_poll_slug);
END;
$$;

REVOKE ALL ON FUNCTION public.get_poll_state(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.submit_poll_vote(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_poll_state(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_poll_vote(text, text) TO authenticated;
