import { Injectable } from '@nestjs/common';
import type { Consultor } from '../../../common/database/base-datos.service.js';
import type { FiltrosCarteraDto } from '../dto/consultas.dto.js';
import { patronBusqueda } from '../utils/patron-busqueda.js';

export type EstadoCartera = 'AL_DIA' | 'PENDIENTE' | 'VENCIDO';

export interface FilaCartera {
  patinadorId: number;
  patinador: string;
  documento: string;
  esMenor: boolean;
  acudientes: string;
  planId: number | null;
  plan: string | null;
  estado: EstadoCartera;
  saldoPendiente: number;
  cobrosConSaldo: number;
  cobrosVencidos: number;
  vencimientoMasAntiguo: string | null;
}

export interface ResumenCartera {
  saldoPendiente: number;
  cobrosConSaldo: number;
  alDia: number;
  pendiente: number;
  vencido: number;
  saldoVencido: number;
}

/** Lecturas de la cartera (vista v_estado_cartera, RF-M5-12) para la consulta de RF-M5-13. */
@Injectable()
export class CarteraRepository {
  /** Patinadores activos con su estado de cartera, filtrables y combinables. */
  async listar(consultor: Consultor, filtros: FiltrosCarteraDto): Promise<FilaCartera[]> {
    const { rows } = await consultor.query<FilaCartera>(
      `SELECT p.id AS "patinadorId",
              p.nombres || ' ' || p.apellidos AS patinador,
              p.tipo_documento || ' ' || p.numero_documento AS documento,
              age(current_date, p.fecha_nacimiento) < interval '18 years' AS "esMenor",
              COALESCE((
                SELECT string_agg(u.nombres || ' ' || u.apellidos, ', ' ORDER BY u.nombres)
                FROM acudiente_patinador ap JOIN usuario u ON u.id = ap.acudiente_id
                WHERE ap.patinador_id = p.id AND ap.desvinculado_en IS NULL
              ), '') AS acudientes,
              pa.plan_id AS "planId",
              pa.nombre AS plan,
              ec.estado,
              ec.saldo_pendiente AS "saldoPendiente",
              (SELECT count(*)::int FROM v_saldo_cobro s
                WHERE s.patinador_id = p.id AND s.estado <> 'ANULADO' AND s.saldo > 0) AS "cobrosConSaldo",
              ec.cobros_vencidos::int AS "cobrosVencidos",
              ec.vencimiento_mas_antiguo AS "vencimientoMasAntiguo"
       FROM patinador p
       JOIN v_estado_cartera ec ON ec.patinador_id = p.id
       LEFT JOIN LATERAL (
         SELECT a.plan_id, pl.nombre
         FROM asignacion_plan a JOIN plan pl ON pl.id = a.plan_id
         WHERE a.patinador_id = p.id AND a.fecha_inicio <= current_date
           AND (a.fecha_fin IS NULL OR a.fecha_fin >= current_date)
         LIMIT 1
       ) pa ON true
       WHERE p.activo
         AND ($1::text IS NULL OR ec.estado = $1)
         AND ($2::bigint IS NULL OR pa.plan_id = $2)
         AND ($3::text IS NULL OR p.nombres || ' ' || p.apellidos ILIKE $3 OR p.numero_documento ILIKE $3)
         AND ($4::text IS NULL OR EXISTS (
               SELECT 1 FROM acudiente_patinador ap JOIN usuario u ON u.id = ap.acudiente_id
               WHERE ap.patinador_id = p.id AND ap.desvinculado_en IS NULL
                 AND u.nombres || ' ' || u.apellidos ILIKE $4))
         AND ($5::date IS NULL OR ec.vencimiento_mas_antiguo >= $5)
         AND ($6::date IS NULL OR ec.vencimiento_mas_antiguo <= $6)
       ORDER BY CASE ec.estado WHEN 'VENCIDO' THEN 0 WHEN 'PENDIENTE' THEN 1 ELSE 2 END,
                ec.saldo_pendiente DESC, patinador`,
      [
        filtros.estado ?? null,
        filtros.planId ?? null,
        patronBusqueda(filtros.patinador),
        patronBusqueda(filtros.acudiente),
        filtros.venceDesde ?? null,
        filtros.venceHasta ?? null,
      ],
    );
    return rows;
  }

  /** Cartera de un solo patinador (estado de cuenta). */
  async dePatinador(consultor: Consultor, patinadorId: number): Promise<FilaCartera | null> {
    const { rows } = await consultor.query<FilaCartera>(
      `SELECT p.id AS "patinadorId",
              p.nombres || ' ' || p.apellidos AS patinador,
              p.tipo_documento || ' ' || p.numero_documento AS documento,
              age(current_date, p.fecha_nacimiento) < interval '18 years' AS "esMenor",
              '' AS acudientes, NULL::bigint AS "planId", NULL::text AS plan,
              ec.estado,
              ec.saldo_pendiente AS "saldoPendiente",
              (SELECT count(*)::int FROM v_saldo_cobro s
                WHERE s.patinador_id = p.id AND s.estado <> 'ANULADO' AND s.saldo > 0) AS "cobrosConSaldo",
              ec.cobros_vencidos::int AS "cobrosVencidos",
              ec.vencimiento_mas_antiguo AS "vencimientoMasAntiguo"
       FROM patinador p JOIN v_estado_cartera ec ON ec.patinador_id = p.id
       WHERE p.id = $1`,
      [patinadorId],
    );
    return rows[0] ?? null;
  }

  /** Indicadores de toda la escuela (patinadores activos), sin filtros. */
  async resumen(consultor: Consultor): Promise<ResumenCartera> {
    const { rows } = await consultor.query<ResumenCartera>(
      `SELECT COALESCE(sum(ec.saldo_pendiente), 0) AS "saldoPendiente",
              (SELECT count(*)::int FROM v_saldo_cobro s JOIN patinador p2 ON p2.id = s.patinador_id
                WHERE p2.activo AND s.estado <> 'ANULADO' AND s.saldo > 0) AS "cobrosConSaldo",
              count(*) FILTER (WHERE ec.estado = 'AL_DIA')::int AS "alDia",
              count(*) FILTER (WHERE ec.estado = 'PENDIENTE')::int AS pendiente,
              count(*) FILTER (WHERE ec.estado = 'VENCIDO')::int AS vencido,
              COALESCE(sum(ec.saldo_pendiente) FILTER (WHERE ec.estado = 'VENCIDO'), 0) AS "saldoVencido"
       FROM v_estado_cartera ec JOIN patinador p ON p.id = ec.patinador_id
       WHERE p.activo`,
    );
    return rows[0];
  }
}
