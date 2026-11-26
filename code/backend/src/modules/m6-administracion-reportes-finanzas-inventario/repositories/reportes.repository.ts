import { Injectable } from '@nestjs/common';
import { BaseDatosService } from '../../../common/database/base-datos.service.js';
import type {
  CarteraPatinador,
  IngresoPorConcepto,
  MovimientoUniforme,
  PagoRecibido,
  Reembolsos,
  ValoresVentas,
} from '../utils/reglas-reporte.js';

// Consultas de solo lectura de los reportes financieros (HU-6.4).

const SQL_INGRESOS = `
  WITH pagos AS (
    SELECT id, monto FROM pago
    WHERE estado = 'REGISTRADO' AND fecha_pago BETWEEN $1::date AND $2::date
  ),
  aplicado AS (
    SELECT c.concepto, pc.pago_id, pc.monto_aplicado
    FROM pagos p
    JOIN pago_cobro pc ON pc.pago_id = p.id
    JOIN cobro c       ON c.id = pc.cobro_id
  ),
  sin_cobro AS (
    SELECT 'OTRO'::text AS concepto, p.id AS pago_id,
           p.monto - COALESCE((SELECT sum(a.monto_aplicado) FROM aplicado a WHERE a.pago_id = p.id), 0) AS monto_aplicado
    FROM pagos p
  )
  SELECT concepto, count(DISTINCT pago_id)::int AS pagos, sum(monto_aplicado) AS valor
  FROM (SELECT * FROM aplicado UNION ALL SELECT * FROM sin_cobro WHERE monto_aplicado > 0) t
  GROUP BY concepto`;

/** Reembolsos de devoluciones parciales cuya venta conserva su pago. */
const SQL_REEMBOLSOS = `
  SELECT count(*)::int AS devoluciones, COALESCE(sum(d.valor_devuelto), 0) AS valor
  FROM devolucion_venta d
  JOIN venta_uniforme v ON v.id = d.venta_id
  JOIN pago p           ON p.id = v.pago_id
  WHERE NOT d.anula_pago AND p.estado = 'REGISTRADO'
    AND d.fecha BETWEEN $1::date AND $2::date`;

const SQL_PAGOS = `
  SELECT p.fecha_pago AS fecha, c.numero AS comprobante,
         pt.nombres || ' ' || pt.apellidos AS patinador,
         p.tipo, p.medio_pago AS medio, p.referencia, p.monto
  FROM pago p
  JOIN patinador pt        ON pt.id = p.patinador_id
  LEFT JOIN comprobante c  ON c.pago_id = p.id
  WHERE p.estado = 'REGISTRADO' AND p.fecha_pago BETWEEN $1::date AND $2::date
  ORDER BY p.fecha_pago, p.id`;

const SQL_CARTERA = `
  WITH gracia AS (
    SELECT COALESCE((SELECT valor::int FROM parametro_sistema WHERE clave = 'dias_gracia_mora'), 0) AS dias
  ),
  saldos AS (
    SELECT c.patinador_id, c.fecha_limite,
           c.valor - COALESCE((
             SELECT sum(pc.monto_aplicado)
             FROM pago_cobro pc JOIN pago p ON p.id = pc.pago_id
             WHERE pc.cobro_id = c.id AND p.estado = 'REGISTRADO' AND p.fecha_pago <= $1::date
           ), 0) AS saldo,
           c.fecha_limite + 1 + (SELECT dias FROM gracia) <= $1::date AS vencido
    FROM cobro c
    WHERE c.estado <> 'ANULADO'
      AND (c.creado_en AT TIME ZONE 'America/Bogota')::date <= $1::date
  )
  SELECT pt.nombres || ' ' || pt.apellidos AS patinador,
         count(*)::int AS cobros,
         min(s.fecha_limite) AS "vencimientoMasAntiguo",
         sum(s.saldo) AS saldo,
         COALESCE(sum(s.saldo) FILTER (WHERE s.vencido), 0) AS "saldoVencido"
  FROM saldos s
  JOIN patinador pt ON pt.id = s.patinador_id
  WHERE s.saldo > 0
  GROUP BY pt.id
  ORDER BY sum(s.saldo) DESC, patinador`;

const SQL_MOVIMIENTOS = `
  SELECT (m.registrado_en AT TIME ZONE 'America/Bogota')::date AS fecha,
         u.referencia, u.talla, m.tipo, m.cantidad,
         CASE WHEN m.tipo = 'VENTA' THEN vd.valor_unitario * abs(m.cantidad) END AS valor,
         m.observacion,
         us.nombres || ' ' || us.apellidos AS "registradoPor"
  FROM movimiento_inventario m
  JOIN uniforme u          ON u.id = m.uniforme_id
  JOIN usuario us          ON us.id = m.registrado_por
  LEFT JOIN venta_detalle vd ON m.tipo = 'VENTA' AND vd.venta_id = m.venta_id AND vd.uniforme_id = m.uniforme_id
  WHERE (m.registrado_en AT TIME ZONE 'America/Bogota')::date BETWEEN $1::date AND $2::date
  ORDER BY m.registrado_en, m.id`;

const SQL_VALORES_VENTAS = `
  SELECT
    COALESCE((SELECT sum(total) FROM venta_uniforme WHERE fecha BETWEEN $1::date AND $2::date), 0) AS "valorVentas",
    COALESCE((SELECT sum(valor_devuelto) FROM devolucion_venta WHERE fecha BETWEEN $1::date AND $2::date), 0) AS "valorDevuelto"`;

@Injectable()
export class ReportesRepository {
  constructor(private readonly baseDatos: BaseDatosService) {}

  ingresosPorConcepto(desde: string, hasta: string): Promise<IngresoPorConcepto[]> {
    return this.baseDatos.consultar<IngresoPorConcepto & Record<string, unknown>>(SQL_INGRESOS, [desde, hasta]);
  }

  async reembolsos(desde: string, hasta: string): Promise<Reembolsos> {
    const [fila] = await this.baseDatos.consultar<Reembolsos & Record<string, unknown>>(SQL_REEMBOLSOS, [desde, hasta]);
    return fila;
  }

  pagosRecibidos(desde: string, hasta: string): Promise<PagoRecibido[]> {
    return this.baseDatos.consultar<PagoRecibido & Record<string, unknown>>(SQL_PAGOS, [desde, hasta]);
  }

  carteraAFecha(corte: string): Promise<CarteraPatinador[]> {
    return this.baseDatos.consultar<CarteraPatinador & Record<string, unknown>>(SQL_CARTERA, [corte]);
  }

  movimientosUniformes(desde: string, hasta: string): Promise<MovimientoUniforme[]> {
    return this.baseDatos.consultar<MovimientoUniforme & Record<string, unknown>>(SQL_MOVIMIENTOS, [desde, hasta]);
  }

  async valoresVentas(desde: string, hasta: string): Promise<ValoresVentas> {
    const [fila] = await this.baseDatos.consultar<ValoresVentas & Record<string, unknown>>(SQL_VALORES_VENTAS, [desde, hasta]);
    return fila;
  }
}
