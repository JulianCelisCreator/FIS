import { Injectable } from '@nestjs/common';
import type { Consultor } from '../../../common/database/base-datos.service.js';
import type { Plan } from './planes.repository.js';

export interface Asignacion {
  id: number;
  planId: number;
  planNombre: string;
  tipo: Plan['tipo'];
  periodicidad: Plan['periodicidad'];
  diasPorSemana: number | null;
  fechaInicio: string;
  fechaFin: string | null;
  motivoCambio: string | null;
}

export interface NuevaAsignacion {
  patinadorId: number;
  planId: number;
  fechaInicio: string;
  asignacionAnteriorId: number | null;
  motivoCambio: string | null;
  asignadoPor: number;
}

const COLUMNAS = `a.id,
  a.plan_id AS "planId",
  p.nombre AS "planNombre",
  p.tipo,
  p.periodicidad,
  p.dias_por_semana AS "diasPorSemana",
  a.fecha_inicio AS "fechaInicio",
  a.fecha_fin AS "fechaFin",
  a.motivo_cambio AS "motivoCambio"`;

@Injectable()
export class AsignacionesRepository {
  /** Asignación que rige en `fecha`. */
  async vigente(consultor: Consultor, patinadorId: number, fecha: string): Promise<Asignacion | null> {
    const { rows } = await consultor.query<Asignacion>(
      `SELECT ${COLUMNAS}
       FROM asignacion_plan a JOIN plan p ON p.id = a.plan_id
       WHERE a.patinador_id = $1
         AND a.fecha_inicio <= $2
         AND (a.fecha_fin IS NULL OR a.fecha_fin >= $2)`,
      [patinadorId, fecha],
    );
    return rows[0] ?? null;
  }

  /** Asignación que empieza después de `fecha` (un plan asignado a futuro o un cambio programado). */
  async programada(consultor: Consultor, patinadorId: number, fecha: string): Promise<Asignacion | null> {
    const { rows } = await consultor.query<Asignacion>(
      `SELECT ${COLUMNAS}
       FROM asignacion_plan a JOIN plan p ON p.id = a.plan_id
       WHERE a.patinador_id = $1 AND a.fecha_inicio > $2
       ORDER BY a.fecha_inicio
       LIMIT 1`,
      [patinadorId, fecha],
    );
    return rows[0] ?? null;
  }

  async historial(consultor: Consultor, patinadorId: number): Promise<Asignacion[]> {
    const { rows } = await consultor.query<Asignacion>(
      `SELECT ${COLUMNAS}
       FROM asignacion_plan a JOIN plan p ON p.id = a.plan_id
       WHERE a.patinador_id = $1
       ORDER BY a.fecha_inicio DESC`,
      [patinadorId],
    );
    return rows;
  }

  /** Última fecha de fin del historial; una nueva asignación no puede solaparse con ella. */
  async ultimaFechaFin(consultor: Consultor, patinadorId: number): Promise<string | null> {
    const { rows } = await consultor.query<{ fechaFin: string | null }>(
      `SELECT max(fecha_fin) AS "fechaFin" FROM asignacion_plan WHERE patinador_id = $1`,
      [patinadorId],
    );
    return rows[0]?.fechaFin ?? null;
  }

  async tieneHistorial(consultor: Consultor, patinadorId: number): Promise<boolean> {
    const { rows } = await consultor.query<{ existe: boolean }>(
      'SELECT EXISTS (SELECT 1 FROM asignacion_plan WHERE patinador_id = $1) AS existe',
      [patinadorId],
    );
    return rows[0].existe;
  }

  async crear(consultor: Consultor, datos: NuevaAsignacion): Promise<number> {
    const { rows } = await consultor.query<{ id: number }>(
      `INSERT INTO asignacion_plan
         (patinador_id, plan_id, fecha_inicio, asignacion_anterior_id, motivo_cambio, asignado_por)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [
        datos.patinadorId,
        datos.planId,
        datos.fechaInicio,
        datos.asignacionAnteriorId,
        datos.motivoCambio,
        datos.asignadoPor,
      ],
    );
    return rows[0].id;
  }

  async cerrar(consultor: Consultor, asignacionId: number, fechaFin: string): Promise<void> {
    await consultor.query('UPDATE asignacion_plan SET fecha_fin = $2 WHERE id = $1', [
      asignacionId,
      fechaFin,
    ]);
  }
}
