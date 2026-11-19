-- Actualiza el formato anterior de ventas al esquema actual, sin borrar datos.
-- Solo se aplica si no existen ventas: las ventas antiguas requieren conciliacion
-- manual de comprador, pago, cobro y datos historicos de los articulos.
-- Uso (desde code/backend):
--   psql -h localhost -p 5432 -U patinaje -d patinaje -f db/migraciones/2026-11-19-m6-ventas-formato-actual.sql

BEGIN;

LOCK TABLE venta_uniforme, venta_detalle IN ACCESS EXCLUSIVE MODE;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM venta_uniforme) OR EXISTS (SELECT 1 FROM venta_detalle) THEN
    RAISE EXCEPTION 'Hay ventas existentes; concilialas antes de actualizar el formato de ventas';
  END IF;
END;
$$;

ALTER TABLE venta_uniforme
  ADD COLUMN comprador_tipo TEXT NOT NULL CHECK (comprador_tipo IN ('PATINADOR', 'ACUDIENTE')),
  ADD COLUMN medio_pago TEXT NOT NULL CHECK (medio_pago IN ('EFECTIVO', 'TRANSFERENCIA', 'CONSIGNACION')),
  ADD COLUMN pago_id BIGINT NOT NULL UNIQUE REFERENCES pago(id),
  ALTER COLUMN comprador_id DROP NOT NULL,
  ALTER COLUMN patinador_id SET NOT NULL,
  ALTER COLUMN cobro_id SET NOT NULL,
  DROP CONSTRAINT venta_uniforme_total_check,
  ADD CONSTRAINT venta_uniforme_total_check CHECK (total > 0),
  ADD CHECK (comprador_tipo = 'PATINADOR' OR comprador_id IS NOT NULL);

ALTER TABLE venta_detalle
  ADD COLUMN referencia TEXT NOT NULL,
  ADD COLUMN talla TEXT NOT NULL,
  DROP CONSTRAINT venta_detalle_valor_unitario_check,
  ADD CONSTRAINT venta_detalle_valor_unitario_check CHECK (valor_unitario > 0);

CREATE INDEX venta_uniforme_fecha_idx ON venta_uniforme (fecha DESC);

CREATE OR REPLACE FUNCTION fn_venta_inmutable() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Una venta o devolución confirmada no puede modificarse; registra una devolución o un ajuste autorizado'
    USING ERRCODE = 'P0001';
END;
$$;

CREATE TRIGGER trg_venta_uniforme_inmutable BEFORE UPDATE OR DELETE ON venta_uniforme
  FOR EACH ROW EXECUTE FUNCTION fn_venta_inmutable();
CREATE TRIGGER trg_venta_detalle_inmutable BEFORE UPDATE OR DELETE ON venta_detalle
  FOR EACH ROW EXECUTE FUNCTION fn_venta_inmutable();

COMMIT;
