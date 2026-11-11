-- Migración M6 · 2026-11-11
-- Aplica sobre una base ya creada los cambios hechos en schema.sql, sin borrar datos.
-- Uso (desde code/backend):
--   psql -h localhost -p 5433 -U patinaje -d patinaje -f db/migraciones/2026-11-11-m6-implemento-y-telefono-personal.sql
-- Una base nueva no la necesita: schema.sql ya trae estos cambios.

BEGIN;

-- 1. uniforme.tipo admite IMPLEMENTO (HU-6.8: solo se prestan implementos).
--    Sin este valor no se puede crear un implemento y, por tanto, ningún préstamo.
ALTER TABLE uniforme DROP CONSTRAINT IF EXISTS uniforme_tipo_check;
ALTER TABLE uniforme ADD CONSTRAINT uniforme_tipo_check
  CHECK (tipo IN ('CAMISETA','CHAQUETA','PANTALON','UNIFORME_COMPLETO','IMPLEMENTO'));

-- 2. personal.telefono es obligatorio (RF-M6-02).
--    Si hay filas sin teléfono, la migración se detiene para que se completen antes.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM personal WHERE telefono IS NULL OR btrim(telefono) = '') THEN
    RAISE EXCEPTION 'Hay registros de personal sin teléfono; complétalos antes de aplicar la migración';
  END IF;
END;
$$;
ALTER TABLE personal ALTER COLUMN telefono SET NOT NULL;

COMMIT;
