-- Normaliza locked_at como columna normal mantenida por trigger.
-- Idempotente: sirve tanto si locked_at era GENERATED como si ya era normal.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute
    WHERE attrelid = 'public.matches'::regclass
      AND attname = 'locked_at'
      AND attgenerated <> ''
  ) THEN
    ALTER TABLE public.matches ALTER COLUMN locked_at DROP EXPRESSION;
  END IF;
END;
$$;

UPDATE public.matches
SET locked_at = scheduled_at
WHERE scheduled_at IS NOT NULL;

ALTER TABLE public.matches
  ALTER COLUMN locked_at SET NOT NULL;

CREATE OR REPLACE FUNCTION public.set_match_locked_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.locked_at := NEW.scheduled_at;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_match_locked_at ON public.matches;

CREATE OR REPLACE TRIGGER trg_match_locked_at
BEFORE INSERT OR UPDATE OF scheduled_at ON public.matches
FOR EACH ROW
EXECUTE FUNCTION public.set_match_locked_at();
