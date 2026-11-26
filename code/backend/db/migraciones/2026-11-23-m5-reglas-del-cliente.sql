-- Migración M5 · 2026-11-23 · Reglas de la reunión con el cliente (19/11/2026)
-- Aplica sobre una base ya creada los cambios de schema.sql, sin borrar datos:
--   · Pago mensual del día 1 al 5 y «Vencido» desde el día 6 (sin días de gracia).
--   · Recargo por mora (mensual y del día de gracia del plan diario) y clase de valoración.
--   · Cancelación del plan por no pago (motivo_fin).
-- Los porcentajes y el valor de la valoración son provisionales
-- (docs/specs/m5-preguntas-pendientes-cliente.md).
-- Uso (desde code/backend):
--   psql -h localhost -U patinaje -d patinaje -f db/migraciones/2026-11-23-m5-reglas-del-cliente.sql

BEGIN;

ALTER TABLE cobro DROP CONSTRAINT IF EXISTS cobro_concepto_check;
ALTER TABLE cobro ADD CONSTRAINT cobro_concepto_check CHECK (concepto IN (
  'MENSUALIDAD','SESION','MATRICULA','GASTOS_ADMINISTRATIVOS','VENTA_UNIFORME',
  'PRESTAMO_IMPLEMENTO','VALORACION','RECARGO_MORA'));
ALTER TABLE cobro ADD COLUMN IF NOT EXISTS cobro_origen_id BIGINT REFERENCES cobro(id);
CREATE UNIQUE INDEX IF NOT EXISTS cobro_recargo_uk ON cobro (cobro_origen_id)
  WHERE concepto = 'RECARGO_MORA' AND estado <> 'ANULADO';

ALTER TABLE asignacion_plan ADD COLUMN IF NOT EXISTS motivo_fin TEXT;

UPDATE parametro_sistema
SET valor = '0',
    descripcion = 'M5-12: días después de la fecha límite antes de pasar a Vencido (límite día 5 → vencido desde el día 6)'
WHERE clave = 'dias_gracia_mora';

INSERT INTO parametro_sistema (clave, valor, descripcion) VALUES
  ('recargo_mora_mensual_pct', '10',    'M5-12: % de la mensualidad que se cobra como recargo si llega al mes siguiente sin pagar (provisional)'),
  ('recargo_sesion_pct',       '10',    'M5-10: % por sesión si se paga al día siguiente de la clase (día de gracia, provisional)'),
  ('valor_clase_valoracion',   '10000', 'M5: valor de la clase de valoración; se abona a la matrícula si se inscribe (provisional)')
ON CONFLICT (clave) DO NOTHING;

-- Los planes mensuales se pagan en los primeros cinco días del mes.
UPDATE plan SET dia_limite_pago = 5 WHERE periodicidad = 'MENSUAL' AND dia_limite_pago <> 5;

COMMIT;
