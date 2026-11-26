import { Injectable } from '@nestjs/common';
import type { Consultor } from '../../../common/database/base-datos.service.js';

export type ConceptoCobro =
  | 'MENSUALIDAD'
  | 'SESION'
  | 'MATRICULA'
  | 'GASTOS_ADMINISTRATIVOS'
  | 'VENTA_UNIFORME'
  | 'VALORACION'
  | 'RECARGO_MORA'
  | 'PRESTAMO_IMPLEMENTO';

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
  /** Solo en recargos por mora: el cobro que lo originó. */
  cobroOrigenId?: number | null;
}

/** Asignación cancelada por no pago. */
export interface AsignacionCancelada {
  id: number;
  patinadorId: number;
  planId: number;
  fechaFin: string;
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
                          descripcion, valor, fecha_limite, estado, creado_por, cobro_origen_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
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
        datos.cobroOrigenId ?? null,
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

  /** Bloquea varios cobros en orden de id, para no generar bloqueos cruzados. */
  async bloquear(consultor: Consultor, cobroIds: number[]): Promise<void> {
    await consultor.query('SELECT id FROM cobro WHERE id = ANY($1::bigint[]) ORDER BY id FOR UPDATE', [cobroIds]);
  }

  /**
   * Recalcula el estado con los pagos que siguen registrados: si le queda
   * saldo vuelve a PENDIENTE (RF-M5-11). Un cobro anulado no cambia.
   */
  async recalcularEstado(consultor: Consultor, cobroId: number): Promise<'PENDIENTE' | 'PAGADO' | 'ANULADO'> {
    const { rows } = await consultor.query<{ estado: 'PENDIENTE' | 'PAGADO' | 'ANULADO' }>(
      `UPDATE cobro c
       SET estado = CASE WHEN s.saldo <= 0 THEN 'PAGADO' ELSE 'PENDIENTE' END
       FROM v_saldo_cobro s
       WHERE c.id = $1 AND s.cobro_id = c.id AND c.estado <> 'ANULADO'
       RETURNING c.estado`,
      [cobroId],
    );
    return rows[0]?.estado ?? 'ANULADO';
  }

  /** Anula un cobro con su motivo (el de sesiones que nace y muere con su pago). */
  async anular(consultor: Consultor, cobroId: number, motivo: string): Promise<void> {
    await consultor.query(
      `UPDATE cobro SET estado = 'ANULADO', anulado_en = now(), motivo_anulacion = $2 WHERE id = $1`,
      [cobroId, motivo],
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
  /** Valor numérico de parametro_sistema (porcentajes de recargo, valor de la valoración…). */
  async parametroNumerico(consultor: Consultor, clave: string, porDefecto: number): Promise<number> {
    const { rows } = await consultor.query<{ valor: string }>(
      'SELECT valor FROM parametro_sistema WHERE clave = $1',
      [clave],
    );
    const valor = Number(rows[0]?.valor);
    return rows[0] && Number.isFinite(valor) ? valor : porDefecto;
  }

  /**
   * Recargo por mora mensual (reunión del 19/11/2026): cada mensualidad que
   * llega al mes siguiente con saldo genera un recargo del `porcentaje` de su
   * valor, una sola vez. Vence el día 5 del mes en curso.
   */
  async generarRecargosMora(consultor: Consultor, mesActual: string, porcentaje: number): Promise<number> {
    if (porcentaje <= 0) return 0;
    const { rowCount } = await consultor.query(
      `INSERT INTO cobro (patinador_id, asignacion_plan_id, concepto, descripcion, valor,
                          fecha_limite, generado_automatico, cobro_origen_id)
       SELECT c.patinador_id, c.asignacion_plan_id, 'RECARGO_MORA',
              'Recargo por mora de ' ||
                (ARRAY['enero','febrero','marzo','abril','mayo','junio','julio','agosto',
                       'septiembre','octubre','noviembre','diciembre'])[extract(month FROM c.periodo)::int]
                || ' de ' || extract(year FROM c.periodo)::int,
              round(c.valor * $2::numeric / 100), $1::date + 4, true, c.id
       FROM cobro c
       JOIN v_saldo_cobro s ON s.cobro_id = c.id
       WHERE c.concepto = 'MENSUALIDAD' AND c.estado <> 'ANULADO'
         AND c.periodo < $1::date AND s.saldo > 0
       ON CONFLICT (cobro_origen_id) WHERE concepto = 'RECARGO_MORA' AND estado <> 'ANULADO'
       DO NOTHING`,
      [mesActual, porcentaje],
    );
    return rowCount ?? 0;
  }

  /**
   * Cancelación por no pago: quien al empezar el mes `mesActual` debe una
   * mensualidad de dos meses atrás o más (tercer mes sin pagar) pierde el plan
   * desde ese día. Su plan termina el último día del mes anterior y un cambio
   * de plan programado que aún no generó cobros se descarta. Las deudas siguen.
   */
  async cancelarPorMora(consultor: Consultor, mesActual: string): Promise<AsignacionCancelada[]> {
    const { rows } = await consultor.query<AsignacionCancelada>(
      `WITH morosos AS (
         SELECT DISTINCT c.patinador_id
         FROM cobro c JOIN v_saldo_cobro s ON s.cobro_id = c.id
         WHERE c.concepto = 'MENSUALIDAD' AND c.estado <> 'ANULADO' AND s.saldo > 0
           AND c.periodo <= ($1::date - interval '2 months')::date
       )
       UPDATE asignacion_plan a
       SET fecha_fin = $1::date - 1,
           motivo_fin = 'Cancelado por no pago: mensualidad pendiente desde hace tres meses'
       FROM morosos m
       WHERE a.patinador_id = m.patinador_id
         AND a.fecha_inicio < $1::date
         AND (a.fecha_fin IS NULL OR a.fecha_fin >= $1::date)
       RETURNING a.id, a.patinador_id AS "patinadorId", a.plan_id AS "planId", a.fecha_fin AS "fechaFin"`,
      [mesActual],
    );
    if (rows.length > 0) {
      await consultor.query(
        `DELETE FROM asignacion_plan a
         WHERE a.patinador_id = ANY($1::bigint[]) AND a.fecha_inicio >= $2::date
           AND NOT EXISTS (SELECT 1 FROM cobro c WHERE c.asignacion_plan_id = a.id)`,
        [rows.map((fila) => fila.patinadorId), mesActual],
      );
    }
    return rows;
  }

  /** Valor de la valoración pagada (pago no anulado) que aún puede abonarse, o null. */
  async valoracionPagada(consultor: Consultor, patinadorId: number): Promise<number | null> {
    const { rows } = await consultor.query<{ valor: number }>(
      `SELECT c.valor FROM cobro c
       WHERE c.patinador_id = $1 AND c.concepto = 'VALORACION' AND c.estado = 'PAGADO'
       ORDER BY c.id DESC LIMIT 1`,
      [patinadorId],
    );
    return rows[0]?.valor ?? null;
  }

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
