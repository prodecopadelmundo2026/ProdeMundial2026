-- Convierte locked_at de GENERATED ALWAYS AS a columna normal,
-- y agrega un trigger que la mantiene actualizada.

-- 1. Quitar el atributo GENERATED sin tocar la columna ni evaluar la expresión
ALTER TABLE matches ALTER COLUMN locked_at DROP EXPRESSION;

-- 2. Poblar filas existentes
UPDATE matches
SET locked_at = scheduled_at - interval '5 minutes'
WHERE scheduled_at IS NOT NULL;

-- 3. Función del trigger
CREATE OR REPLACE FUNCTION set_match_locked_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.locked_at := NEW.scheduled_at - interval '5 minutes';
  RETURN NEW;
END;
$$;

-- 4. Trigger: dispara en INSERT y en UPDATE solo si cambia scheduled_at
CREATE OR REPLACE TRIGGER trg_match_locked_at
BEFORE INSERT OR UPDATE OF scheduled_at ON matches
FOR EACH ROW
EXECUTE FUNCTION set_match_locked_at();
