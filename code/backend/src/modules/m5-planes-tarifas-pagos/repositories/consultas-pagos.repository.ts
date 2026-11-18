import { Injectable } from '@nestjs/common';
import type { Consultor } from '../../../common/database/base-datos.service.js';
import type { FiltrosHistorialDto } from '../dto/consultas.dto.js';
import type { MedioPago } from '../enums/medio-pago.enum.js';
import { patronBusqueda } from '../utils/patron-busqueda.js';

/** Máximo de pagos por consulta del historial (la exportación usa el mismo límite). */
export const LIMITE_HISTORIAL = 500;

export interface CobroAplicado {
  concepto: string;
  descripcion: string | null;
  periodo: string | null;
  fechaLimite: string;
  montoAplicado: number;
}

export interface FilaPago {
  pagoId: number;
  fechaPago: string;
  comprobante: string | null;
  estadoComprobante: 'VIGENTE' | 'ANULADO' | null;
  patinadorId: number;
  patinador: string;
  acudientes: string;
  tipo: 'COBRO' | 'SESION' | 'MATRICULA' | 'VENTA_UNIFORME';
  monto: number;
  medioPago: MedioPago;
  referencia: string | null;
  numeroSesiones: number | null;
  registradoPor: string;
  registradoEn: Date;
  estado: 'REGISTRADO' | 'ANULADO';
  anuladoPor: string | null;
  anuladoEn: Date | null;
  motivoAnulacion: string | null;
  cobros: CobroAplicado[];
}

export interface FilaCobro {
  id: number;
  concepto: string;
  descripcion: string | null;
  periodo: string | null;
  valor: number;
  pagado: number;
  saldo: number;
  fechaLimite: string;
  vencidoDesde: string;
  vencido: boolean;
}

export interface PlanDeCuenta {
  planId: number;
  nombre: string;
  periodicidad: 'MENSUAL' | 'POR_SESION';
  diaLimitePago: number | null;
  fechaInicio: string;
  tarifa: number | null;
}

/** Cobro aplicado en un comprobante, con los valores al momento de ese pago. */
export interface CobroDeComprobante {
  concepto: string;
  descripcion: string | null;
  periodo: string | null;
  plan: string | null;
  valor: number;
  pagosAnteriores: number;
  estePago: number;
  saldoRestante: number;
}

export interface DatosComprobante {
  pagoId: number;
  numero: string;
  estadoComprobante: 'VIGENTE' | 'ANULADO';
  patinadorId: number;
  patinador: string;
  documento: string;
  acudientes: string;
  tipo: FilaPago['tipo'];
  fechaPago: string;
  monto: number;
  medioPago: MedioPago;
  referencia: string | null;
  numeroSesiones: number | null;
  registradoPor: string;
  rolesRegistro: string;
  registradoEn: Date;
  estado: FilaPago['estado'];
  anuladoPor: string | null;
  anuladoEn: Date | null;
  motivoAnulacion: string | null;
  cobros: CobroDeComprobante[];
}

const COLUMNAS_PAGO = `pg.id AS "pagoId",
  pg.fecha_pago AS "fechaPago",
  c.numero AS comprobante,
  c.estado AS "estadoComprobante",
  pt.id AS "patinadorId",
  pt.nombres || ' ' || pt.apellidos AS patinador,
  COALESCE((
    SELECT string_agg(u.nombres || ' ' || u.apellidos, ', ' ORDER BY u.nombres)
    FROM acudiente_patinador ap JOIN usuario u ON u.id = ap.acudiente_id
    WHERE ap.patinador_id = pt.id AND ap.desvinculado_en IS NULL
  ), '') AS acudientes,
  pg.tipo,
  pg.monto,
  pg.medio_pago AS "medioPago",
  pg.referencia,
  pg.numero_sesiones AS "numeroSesiones",
  ur.nombres || ' ' || ur.apellidos AS "registradoPor",
  pg.registrado_en AS "registradoEn",
  pg.estado,
  ua.nombres || ' ' || ua.apellidos AS "anuladoPor",
  pg.anulado_en AS "anuladoEn",
  pg.motivo_anulacion AS "motivoAnulacion",
  COALESCE((
    SELECT json_agg(json_build_object(
             'concepto', co.concepto, 'descripcion', co.descripcion, 'periodo', co.periodo,
             'fechaLimite', co.fecha_limite, 'montoAplicado', pc.monto_aplicado)
           ORDER BY co.fecha_limite, co.id)
    FROM pago_cobro pc JOIN cobro co ON co.id = pc.cobro_id
    WHERE pc.pago_id = pg.id
  ), '[]') AS cobros`;

const UNIONES_PAGO = `FROM pago pg
  JOIN patinador pt ON pt.id = pg.patinador_id
  JOIN usuario ur ON ur.id = pg.registrado_por
  LEFT JOIN usuario ua ON ua.id = pg.anulado_por
  LEFT JOIN comprobante c ON c.pago_id = pg.id`;

/**
 * Lecturas de pagos, cobros y comprobantes para las consultas de M5
 * (RF-M5-15 a RF-M5-18). Solo lee.
 */
@Injectable()
export class ConsultasPagosRepository {
  /** Historial de pagos con filtros, del más reciente al más antiguo. Incluye los anulados. */
  async historial(
    consultor: Consultor,
    filtros: FiltrosHistorialDto & { patinadorId?: number },
  ): Promise<FilaPago[]> {
    const { rows } = await consultor.query<FilaPago>(
      `SELECT ${COLUMNAS_PAGO}
       ${UNIONES_PAGO}
       WHERE ($1::date IS NULL OR pg.fecha_pago >= $1)
         AND ($2::date IS NULL OR pg.fecha_pago <= $2)
         AND ($3::text IS NULL OR pg.medio_pago = $3)
         AND ($4::text IS NULL OR pg.estado = $4)
         AND ($5::text IS NULL
              OR pt.nombres || ' ' || pt.apellidos ILIKE $5
              OR pt.numero_documento ILIKE $5
              OR c.numero ILIKE $5
              OR EXISTS (SELECT 1 FROM acudiente_patinador ap JOIN usuario u ON u.id = ap.acudiente_id
                         WHERE ap.patinador_id = pt.id AND ap.desvinculado_en IS NULL
                           AND u.nombres || ' ' || u.apellidos ILIKE $5))
         AND ($6::bigint IS NULL OR pg.patinador_id = $6)
       ORDER BY pg.fecha_pago DESC, pg.id DESC
       LIMIT $7`,
      [
        filtros.desde ?? null,
        filtros.hasta ?? null,
        filtros.medio ?? null,
        filtros.estado ?? null,
        patronBusqueda(filtros.buscar),
        filtros.patinadorId ?? null,
        LIMITE_HISTORIAL,
      ],
    );
    return rows;
  }

  /** Cobros no anulados del patinador (pagados o con saldo), del más reciente al más antiguo. */
  async cobros(consultor: Consultor, patinadorId: number): Promise<FilaCobro[]> {
    const { rows } = await consultor.query<FilaCobro>(
      `SELECT s.cobro_id AS id, s.concepto, c.descripcion, s.periodo, s.valor, s.pagado, s.saldo,
              s.fecha_limite AS "fechaLimite",
              s.vencido_desde AS "vencidoDesde",
              s.saldo > 0 AND s.vencido_desde <= current_date AS vencido
       FROM v_saldo_cobro s JOIN cobro c ON c.id = s.cobro_id
       WHERE s.patinador_id = $1 AND s.estado <> 'ANULADO'
       ORDER BY s.fecha_limite DESC, s.cobro_id DESC
       LIMIT 36`,
      [patinadorId],
    );
    return rows;
  }

  /** Plan que rige hoy, con su tarifa vigente. */
  async planActual(consultor: Consultor, patinadorId: number): Promise<PlanDeCuenta | null> {
    const { rows } = await consultor.query<PlanDeCuenta>(
      `SELECT pl.id AS "planId", pl.nombre, pl.periodicidad, pl.dia_limite_pago AS "diaLimitePago",
              a.fecha_inicio AS "fechaInicio", tv.valor AS tarifa
       FROM asignacion_plan a
       JOIN plan pl ON pl.id = a.plan_id
       LEFT JOIN v_tarifa_vigente tv ON tv.plan_id = pl.id
       WHERE a.patinador_id = $1 AND a.fecha_inicio <= current_date
         AND (a.fecha_fin IS NULL OR a.fecha_fin >= current_date)`,
      [patinadorId],
    );
    return rows[0] ?? null;
  }

  /**
   * Datos de un comprobante (RF-M5-14/15). Los valores de cada cobro se
   * calculan al momento de ese pago: «pagos anteriores» son los pagos no
   * anulados aplicados antes que este, así el comprobante no cambia aunque
   * después lleguen más pagos.
   */
  async datosComprobante(consultor: Consultor, pagoId: number): Promise<DatosComprobante | null> {
    const { rows } = await consultor.query<DatosComprobante>(
      `SELECT pg.id AS "pagoId",
              c.numero,
              c.estado AS "estadoComprobante",
              pt.id AS "patinadorId",
              pt.nombres || ' ' || pt.apellidos AS patinador,
              pt.tipo_documento || ' ' || pt.numero_documento AS documento,
              COALESCE((
                SELECT string_agg(u.nombres || ' ' || u.apellidos, ', ' ORDER BY u.nombres)
                FROM acudiente_patinador ap JOIN usuario u ON u.id = ap.acudiente_id
                WHERE ap.patinador_id = pt.id AND ap.desvinculado_en IS NULL
              ), '') AS acudientes,
              pg.tipo,
              pg.fecha_pago AS "fechaPago",
              pg.monto,
              pg.medio_pago AS "medioPago",
              pg.referencia,
              pg.numero_sesiones AS "numeroSesiones",
              ur.nombres || ' ' || ur.apellidos AS "registradoPor",
              COALESCE((
                SELECT string_agg(r.nombre, ', ' ORDER BY r.nombre)
                FROM usuario_rol uro JOIN rol r ON r.id = uro.rol_id
                WHERE uro.usuario_id = ur.id
              ), '') AS "rolesRegistro",
              pg.registrado_en AS "registradoEn",
              pg.estado,
              ua.nombres || ' ' || ua.apellidos AS "anuladoPor",
              pg.anulado_en AS "anuladoEn",
              pg.motivo_anulacion AS "motivoAnulacion",
              COALESCE((
                SELECT json_agg(json_build_object(
                         'concepto', co.concepto,
                         'descripcion', co.descripcion,
                         'periodo', co.periodo,
                         'plan', pl.nombre,
                         'valor', co.valor,
                         'pagosAnteriores', ant.total,
                         'estePago', pc.monto_aplicado,
                         'saldoRestante', co.valor - ant.total - pc.monto_aplicado)
                       ORDER BY co.fecha_limite, co.id)
                FROM pago_cobro pc
                JOIN cobro co ON co.id = pc.cobro_id
                LEFT JOIN asignacion_plan a ON a.id = co.asignacion_plan_id
                LEFT JOIN plan pl ON pl.id = a.plan_id
                CROSS JOIN LATERAL (
                  SELECT COALESCE(sum(pc2.monto_aplicado), 0) AS total
                  FROM pago_cobro pc2 JOIN pago p2 ON p2.id = pc2.pago_id
                  WHERE pc2.cobro_id = co.id AND p2.id < pg.id AND p2.estado = 'REGISTRADO'
                ) ant
                WHERE pc.pago_id = pg.id
              ), '[]') AS cobros
       FROM pago pg
       JOIN comprobante c ON c.pago_id = pg.id
       JOIN patinador pt ON pt.id = pg.patinador_id
       JOIN usuario ur ON ur.id = pg.registrado_por
       LEFT JOIN usuario ua ON ua.id = pg.anulado_por
       WHERE pg.id = $1`,
      [pagoId],
    );
    return rows[0] ?? null;
  }

  /** Patinador al que pertenece un pago (para validar el acceso al comprobante). */
  async patinadorDelPago(consultor: Consultor, pagoId: number): Promise<number | null> {
    const { rows } = await consultor.query<{ patinadorId: number }>(
      'SELECT patinador_id AS "patinadorId" FROM pago WHERE id = $1',
      [pagoId],
    );
    return rows[0]?.patinadorId ?? null;
  }
}
