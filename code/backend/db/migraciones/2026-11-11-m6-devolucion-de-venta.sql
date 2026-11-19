-- Migración M6 · 2026-11-11 · Devolución de ventas de uniformes (HU-6.7)
-- Aplica sobre una base ya creada los cambios de schema.sql, sin borrar datos.
-- Uso (desde code/backend):
--   psql -h localhost -p 5432 -U patinaje -d patinaje -f db/migraciones/2026-11-11-m6-devolucion-de-venta.sql

BEGIN;

CREATE OR REPLACE FUNCTION fn_venta_inmutable() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Una venta o devolución confirmada no puede modificarse; registra una devolución o un ajuste autorizado'
    USING ERRCODE = 'P0001';
END;
$$;

CREATE TABLE devolucion_venta (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  venta_id        BIGINT NOT NULL REFERENCES venta_uniforme(id),
  fecha           DATE NOT NULL DEFAULT current_date,
  motivo          TEXT NOT NULL CHECK (btrim(motivo) <> ''),
  valor_devuelto  NUMERIC(14,2) NOT NULL CHECK (valor_devuelto > 0),
  medio_reembolso TEXT NOT NULL CHECK (medio_reembolso IN ('EFECTIVO','TRANSFERENCIA','CONSIGNACION')),
  anula_pago      BOOLEAN NOT NULL DEFAULT false,
  registrado_por  BIGINT NOT NULL REFERENCES usuario(id),
  creado_en       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX devolucion_venta_venta_idx ON devolucion_venta (venta_id);
CREATE INDEX devolucion_venta_fecha_idx ON devolucion_venta (fecha);
COMMENT ON TABLE devolucion_venta IS
  '[M6] Devoluciones de ventas de uniformes (M6-07), totales o parciales. Corrigen una venta sin modificarla. anula_pago = la devolución cubrió toda la venta y se anuló el pago en M5; si no, valor_devuelto se resta de los ingresos en los reportes (M6-04).';

CREATE TABLE devolucion_venta_detalle (
  devolucion_id  BIGINT NOT NULL REFERENCES devolucion_venta(id),
  uniforme_id    BIGINT NOT NULL REFERENCES uniforme(id),
  cantidad       INTEGER NOT NULL CHECK (cantidad > 0),
  valor_unitario NUMERIC(14,2) NOT NULL CHECK (valor_unitario > 0),
  subtotal       NUMERIC(14,2) GENERATED ALWAYS AS (cantidad * valor_unitario) STORED,
  PRIMARY KEY (devolucion_id, uniforme_id)
);
COMMENT ON TABLE devolucion_venta_detalle IS '[M6] Unidades devueltas por referencia, al valor unitario de la venta.';

CREATE TRIGGER trg_devolucion_venta_inmutable BEFORE UPDATE OR DELETE ON devolucion_venta
  FOR EACH ROW EXECUTE FUNCTION fn_venta_inmutable();
CREATE TRIGGER trg_devolucion_venta_detalle_inmutable BEFORE UPDATE OR DELETE ON devolucion_venta_detalle
  FOR EACH ROW EXECUTE FUNCTION fn_venta_inmutable();

COMMIT;
