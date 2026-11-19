-- Migración M6 · 2026-11-11 · Préstamo de implementos con cobro (HU-6.8)
-- Aplica sobre una base ya creada los cambios de schema.sql, sin borrar datos.
-- Requiere antes 2026-11-11-m6-implemento-y-telefono-personal.sql.
-- Uso (desde code/backend):
--   psql -h localhost -p 5432 -U patinaje -d patinaje -f db/migraciones/2026-11-11-m6-prestamo-con-cobro.sql

BEGIN;

-- 1. Nuevo concepto de cobro en M5 para los préstamos.
ALTER TABLE cobro DROP CONSTRAINT IF EXISTS cobro_concepto_check;
ALTER TABLE cobro ADD CONSTRAINT cobro_concepto_check
  CHECK (concepto IN ('MENSUALIDAD','SESION','MATRICULA','GASTOS_ADMINISTRATIVOS',
                      'VENTA_UNIFORME','PRESTAMO_IMPLEMENTO'));

-- 2. Tarifa sugerida por unidad y día en cada referencia.
ALTER TABLE uniforme
  ADD COLUMN IF NOT EXISTS tarifa_prestamo_dia NUMERIC(14,2) NOT NULL DEFAULT 0
    CHECK (tarifa_prestamo_dia >= 0);

-- 3. Cobro de cada préstamo. Los préstamos existentes quedan sin cobro (valor 0).
--    La vista depende de prestamo_uniforme (p.*): se recrea para incluir las columnas.
DROP VIEW IF EXISTS v_prestamo_uniforme;
ALTER TABLE prestamo_uniforme
  ADD COLUMN IF NOT EXISTS tarifa_dia NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (tarifa_dia >= 0),
  ADD COLUMN IF NOT EXISTS dias_cobrados INTEGER NOT NULL DEFAULT 1 CHECK (dias_cobrados >= 1),
  ADD COLUMN IF NOT EXISTS valor_cobro NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (valor_cobro >= 0),
  ADD COLUMN IF NOT EXISTS cobro_id BIGINT UNIQUE REFERENCES cobro(id);
ALTER TABLE prestamo_uniforme
  ADD CONSTRAINT prestamo_uniforme_cobro_check CHECK ((valor_cobro > 0) = (cobro_id IS NOT NULL));

CREATE VIEW v_prestamo_uniforme AS
SELECT p.*,
       CASE WHEN p.estado = 'ACTIVO' AND p.fecha_devolucion_prevista < current_date
            THEN 'VENCIDO' ELSE p.estado END AS estado_actual
FROM prestamo_uniforme p;
COMMENT ON VIEW v_prestamo_uniforme IS '[M6] Préstamos con estado Activo / Vencido / Devuelto / Pérdida o daño (M6-08).';

COMMIT;
