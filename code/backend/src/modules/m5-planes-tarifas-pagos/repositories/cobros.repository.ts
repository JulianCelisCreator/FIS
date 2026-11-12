import { Injectable } from '@nestjs/common';
import type { Consultor } from '../../../common/database/base-datos.service.js';

export type ConceptoCobro =
  | 'MENSUALIDAD'
  | 'SESION'
  | 'MATRICULA'
  | 'GASTOS_ADMINISTRATIVOS'
  | 'VENTA_UNIFORME';

export interface NuevoCobro {
  patinadorId: number;
  asignacionPlanId: number | null;
  tarifaId: number | null;
  concepto: ConceptoCobro;
  periodo: string | null;
  descripcion: string;
  valor: number;
  fechaLimite: string;
  estado: 'PENDIENTE' | 'PAGADO';
  creadoPor: number | null;
}

export interface CobroParaPago {
  id: number;
  patinadorId: number;
  concepto: ConceptoCobro;
  periodo: string | null;
  descripcion: string | null;
  valor: number;
  estado: 'PENDIENTE' | 'PAGADO' | 'ANULADO';
}

export interface CobroPendiente {
  id: number;
  concepto: ConceptoCobro;
  periodo: string | null;
  descripcion: string | null;
  valor: number;
  pagado: number;
  saldo: number;
  fechaLimite: string;
  /** Primer día en mora (fecha límite + días de gracia + 1). */
  vencidoDesde: string;
  vencido: boolean;
}

@Injectable()
export class CobrosRepository {
  async crear(consultor: Consultor, datos: NuevoCobro): Promise<number> {
    const { rows } = await consultor.query<{ id: number }>(
      `INSERT INTO cobro (patinador_id, asignacion_plan_id, tarifa_id, concepto, periodo,
                          descripcion, valor, fecha_limite, estado, creado_por)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id`,
      [
        datos.patinadorId,
        datos.asignacionPlanId,
        datos.tarifaId,
        datos.concepto,
        datos.periodo,
        datos.descripcion,
        datos.valor,
        datos.fechaLimite,
        datos.estado,
        datos.creadoPor,
      ],
    );
    return rows[0].id;
  }

  /** Bloquea el cobro hasta el fin de la transacción: dos pagos simultáneos no pueden superar el saldo. */
  async bloquearParaPago(consultor: Consultor, cobroId: number): Promise<CobroParaPago | null> {
    const { rows } = await consultor.query<CobroParaPago>(
      `SELECT id, patinador_id AS "patinadorId", concepto, periodo, descripcion, valor, estado
       FROM cobro WHERE id = $1
       FOR UPDATE`,
      [cobroId],
    );
    return rows[0] ?? null;
  }

  /** Suma aplicada al cobro por pagos no anulados. */
  async totalPagado(consultor: Consultor, cobroId: number): Promise<number> {
    const { rows } = await consultor.query<{ pagado: number }>(
      `SELECT COALESCE(sum(pc.monto_aplicado), 0) AS pagado
       FROM pago_cobro pc JOIN pago p ON p.id = pc.pago_id
       WHERE pc.cobro_id = $1 AND p.estado = 'REGISTRADO'`,
      [cobroId],
    );
    return rows[0].pagado;
  }

  async marcarPagado(consultor: Consultor, cobroId: number): Promise<void> {
    await consultor.query(`UPDATE cobro SET estado = 'PAGADO' WHERE id = $1`, [cobroId]);
  }


  /** Bloquea un cobro para recalcular su estado de forma segura. */
  async bloquearParaActualizar(consultor: Consultor, cobroId: number): Promise<void> {
    await consultor.query(
      `SELECT id FROM cobro WHERE id = $1 FOR UPDATE`,
      [cobroId],
    );
  }

  /**
   * Recalcula el estado del cobro según los pagos que continúan registrados.
   * Si conserva saldo, vuelve a PENDIENTE.
   */
  async recalcularEstado(consultor: Consultor, cobroId: number): Promise<void> {
    await consultor.query(
      `UPDATE cobro
       SET estado = CASE
         WHEN COALESCE((
           SELECT SUM(pc.monto_aplicado)
           FROM pago_cobro pc
           JOIN pago p ON p.id = pc.pago_id
           WHERE pc.cobro_id = cobro.id
             AND p.estado = 'REGISTRADO'
         ), 0) >= valor THEN 'PAGADO'
         ELSE 'PENDIENTE'
       END,
       actualizado_en = now()
       WHERE id = $1
         AND estado <> 'ANULADO'`,
      [cobroId],
    );
  }


  /** Cobros con saldo, del vencimiento más antiguo al más reciente. */
  async pendientes(consultor: Consultor, patinadorId: number): Promise<CobroPendiente[]> {
    const { rows } = await consultor.query<CobroPendiente>(
      `SELECT s.cobro_id AS id, s.concepto, s.periodo, c.descripcion, s.valor, s.pagado, s.saldo,
              s.fecha_limite AS "fechaLimite",
              s.vencido_desde AS "vencidoDesde",
              s.vencido_desde <= current_date AS vencido
       FROM v_saldo_cobro s JOIN cobro c ON c.id = s.cobro_id
       WHERE s.patinador_id = $1 AND s.estado <> 'ANULADO' AND s.saldo > 0
       ORDER BY s.fecha_limite, s.cobro_id`,
      [patinadorId],
    );
    return rows;
  }

  /** Días de gracia tras la fecha límite antes de pasar a Vencido (parametro_sistema). */
  async diasGraciaMora(consultor: Consultor): Promise<number> {
    const { rows } = await consultor.query<{ dias: number }>(
      `SELECT COALESCE((SELECT valor::int FROM parametro_sistema WHERE clave = 'dias_gracia_mora'), 0) AS dias`,
    );
    return rows[0].dias;
  }

  /** ¿Pagó ya la matrícula y los gastos administrativos? */
  async matriculaPagada(consultor: Consultor, patinadorId: number): Promise<boolean> {
    const { rows } = await consultor.query<{ pagada: boolean }>(
      `SELECT count(DISTINCT concepto) = 2 AS pagada
       FROM cobro
       WHERE patinador_id = $1
         AND concepto IN ('MATRICULA', 'GASTOS_ADMINISTRATIVOS')
         AND estado = 'PAGADO'`,
      [patinadorId],
    );
    return rows[0].pagada;
  }

  /**
   * Genera la mensualidad de `periodo` para cada asignación mensual que rige ese
   * día 1, con la tarifa vigente en esa fecha. Es idempotente: el índice
   * cobro_mensualidad_uk impide duplicar el mes (y respeta la mensualidad
   * prorrateada creada al asignar el plan).
   */
  async generarMensualidades(consultor: Consultor, periodo: string): Promise<number> {
    const { rowCount } = await consultor.query(
      `INSERT INTO cobro (patinador_id, asignacion_plan_id, tarifa_id, concepto, periodo,
                          descripcion, valor, fecha_limite, generado_automatico)
       SELECT a.patinador_id, a.id, t.id, 'MENSUALIDAD', $1::date,
              'Mensualidad ' || p.nombre || ' ' || to_char($1::date, 'MM/YYYY'),
              t.valor, $1::date + (p.dia_limite_pago - 1), true
       FROM asignacion_plan a
       JOIN plan p       ON p.id = a.plan_id AND p.periodicidad = 'MENSUAL'
       JOIN patinador pt ON pt.id = a.patinador_id AND pt.activo
       JOIN LATERAL (
         SELECT id, valor FROM tarifa
         WHERE plan_id = p.id AND vigente_desde <= $1::date
         ORDER BY vigente_desde DESC LIMIT 1
       ) t ON true
       WHERE a.fecha_inicio <= $1::date
         AND (a.fecha_fin IS NULL OR a.fecha_fin >= $1::date)
       ON CONFLICT (asignacion_plan_id, periodo)
         WHERE concepto = 'MENSUALIDAD' AND estado <> 'ANULADO'
       DO NOTHING`,
      [periodo],
    );
    return rowCount ?? 0;
  }

  /** Asignaciones mensuales que rigen en `periodo` pero cuyo plan no tiene tarifa: no se les puede cobrar. */
  async asignacionesSinTarifa(consultor: Consultor, periodo: string): Promise<number> {
    const { rows } = await consultor.query<{ total: number }>(
      `SELECT count(*)::int AS total
       FROM asignacion_plan a
       JOIN plan p ON p.id = a.plan_id AND p.periodicidad = 'MENSUAL'
       WHERE a.fecha_inicio <= $1::date
         AND (a.fecha_fin IS NULL OR a.fecha_fin >= $1::date)
         AND NOT EXISTS (SELECT 1 FROM tarifa t WHERE t.plan_id = p.id AND t.vigente_desde <= $1::date)`,
      [periodo],
    );
    return rows[0].total;
  }
}
