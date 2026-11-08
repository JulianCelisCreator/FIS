import { Injectable } from '@nestjs/common';
import type { Consultor } from '../../../common/database/base-datos.service.js';
import type { ContextoPatinador } from '../validators/acceso-patinador.validator.js';

/** Patinador tal como lo muestran las pantallas de M5 (tarjeta de patinador). */
export interface PatinadorResumen {
  id: number;
  nombre: string;
  tipoDocumento: string;
  numeroDocumento: string;
  edad: number;
  esMenor: boolean;
  acudientes: { id: number; nombre: string; parentesco: string }[];
  planActual: {
    asignacionId: number;
    planId: number;
    nombre: string;
    periodicidad: 'MENSUAL' | 'POR_SESION';
    diasPorSemana: number | null;
    fechaInicio: string;
    fechaFin: string | null;
  } | null;
  tieneCambioProgramado: boolean;
  matriculaPagada: boolean;
  estadoCartera: 'AL_DIA' | 'PENDIENTE' | 'VENCIDO';
}

export interface AlcanceBusqueda {
  /** Administrador y Contador ven a todos los patinadores. */
  todos: boolean;
  /** Si no ve a todos: patinadores de los que es acudiente, o él mismo si es mayor de edad. */
  usuarioId: number;
}

/**
 * Lecturas de M2 (patinador) y M1 (vínculo con acudientes) que M5 necesita para
 * validar permisos y mostrar patinadores. Solo lee: el registro es de M2.
 */
@Injectable()
export class PatinadoresRepository {
  /** Patinadores activos visibles para el usuario, filtrados por nombre o documento (máximo 25). */
  async buscar(
    consultor: Consultor,
    hoy: string,
    alcance: AlcanceBusqueda,
    filtro: { texto?: string; patinadorId?: number } = {},
  ): Promise<PatinadorResumen[]> {
    const texto = filtro.texto;
    const patron = texto?.trim() ? `%${texto.trim().replace(/[\\%_]/g, '\\$&')}%` : null;
    const { rows } = await consultor.query<PatinadorResumen>(
      `SELECT p.id,
              p.nombres || ' ' || p.apellidos AS nombre,
              p.tipo_documento AS "tipoDocumento",
              p.numero_documento AS "numeroDocumento",
              date_part('year', age(current_date, p.fecha_nacimiento))::int AS edad,
              age(current_date, p.fecha_nacimiento) < interval '18 years' AS "esMenor",
              COALESCE((
                SELECT json_agg(json_build_object(
                         'id', u.id, 'nombre', u.nombres || ' ' || u.apellidos,
                         'parentesco', ap.parentesco) ORDER BY u.nombres)
                FROM acudiente_patinador ap JOIN usuario u ON u.id = ap.acudiente_id
                WHERE ap.patinador_id = p.id AND ap.desvinculado_en IS NULL
              ), '[]') AS acudientes,
              (SELECT json_build_object(
                        'asignacionId', a.id, 'planId', pl.id, 'nombre', pl.nombre,
                        'periodicidad', pl.periodicidad, 'diasPorSemana', pl.dias_por_semana,
                        'fechaInicio', a.fecha_inicio, 'fechaFin', a.fecha_fin)
                 FROM asignacion_plan a JOIN plan pl ON pl.id = a.plan_id
                 WHERE a.patinador_id = p.id AND a.fecha_inicio <= $1
                   AND (a.fecha_fin IS NULL OR a.fecha_fin >= $1)) AS "planActual",
              EXISTS (SELECT 1 FROM asignacion_plan a
                      WHERE a.patinador_id = p.id AND a.fecha_inicio > $1) AS "tieneCambioProgramado",
              (SELECT count(DISTINCT c.concepto) = 2 FROM cobro c
                WHERE c.patinador_id = p.id AND c.estado = 'PAGADO'
                  AND c.concepto IN ('MATRICULA', 'GASTOS_ADMINISTRATIVOS')) AS "matriculaPagada",
              ec.estado AS "estadoCartera"
       FROM patinador p
       JOIN v_estado_cartera ec ON ec.patinador_id = p.id
       WHERE p.activo
         AND ($2::text IS NULL
              OR p.nombres || ' ' || p.apellidos ILIKE $2
              OR p.numero_documento ILIKE $2)
         AND ($5::bigint IS NULL OR p.id = $5)
         AND ($3
              OR EXISTS (SELECT 1 FROM acudiente_patinador ap
                         WHERE ap.patinador_id = p.id AND ap.acudiente_id = $4
                           AND ap.desvinculado_en IS NULL)
              OR (p.usuario_id = $4 AND age(current_date, p.fecha_nacimiento) >= interval '18 years'))
       ORDER BY p.nombres, p.apellidos
       LIMIT 25`,
      [hoy, patron, alcance.todos, alcance.usuarioId, filtro.patinadorId ?? null],
    );
    return rows;
  }

  async obtenerContexto(consultor: Consultor, patinadorId: number): Promise<ContextoPatinador | null> {
    const { rows } = await consultor.query<ContextoPatinador>(
      `SELECT p.id,
              p.usuario_id AS "usuarioId",
              p.activo,
              age(current_date, p.fecha_nacimiento) < interval '18 years' AS "esMenor",
              COALESCE(array_agg(ap.acudiente_id::int) FILTER (WHERE ap.id IS NOT NULL), '{}') AS "acudienteIds"
       FROM patinador p
       LEFT JOIN acudiente_patinador ap
              ON ap.patinador_id = p.id AND ap.desvinculado_en IS NULL
       WHERE p.id = $1
       GROUP BY p.id`,
      [patinadorId],
    );
    return rows[0] ?? null;
  }

  /** Bloquea al patinador hasta el fin de la transacción para serializar sus operaciones de plan y pago. */
  async bloquear(consultor: Consultor, patinadorId: number): Promise<void> {
    await consultor.query('SELECT id FROM patinador WHERE id = $1 FOR UPDATE', [patinadorId]);
  }
}
