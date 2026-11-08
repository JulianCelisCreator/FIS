import { Injectable } from '@nestjs/common';
import type { Consultor } from '../../../common/database/base-datos.service.js';
import type { TipoPlan } from '../enums/tipo-plan.enum.js';
import type { TarifaRegistrada } from '../utils/historial-tarifas.js';

export interface Plan {
  id: number;
  nombre: string;
  tipo: 'DIA_UNICO' | 'TRES_DIAS' | 'SEIS_DIAS' | 'SEIS_DIAS_GIMNASIO';
  diasPorSemana: number | null;
  incluyeGimnasio: boolean;
  periodicidad: 'MENSUAL' | 'POR_SESION';
  diaLimitePago: number | null;
  descripcion: string | null;
  estado: 'ACTIVO' | 'INACTIVO';
}

export interface Tarifa {
  id: number;
  valor: number;
  vigenteDesde: string;
}

/** Fila del listado de planes: el plan con su tarifa vigente, la programada y su uso. */
export interface PlanConTarifas extends Plan {
  tarifaVigenteValor: number | null;
  tarifaVigenteDesde: string | null;
  tarifaProgramadaValor: number | null;
  tarifaProgramadaDesde: string | null;
  patinadores: number;
  modificadoPor: string | null;
  modificadoEn: Date | null;
}

export interface FiltrosListadoPlanes {
  id?: number;
  tipo?: TipoPlan;
  estado?: 'ACTIVO' | 'INACTIVO';
  buscar?: string;
  /** Solo planes activos con tarifa vigente (la oferta, RF-M5-05). */
  soloOfertables?: boolean;
}

export interface NuevoPlan {
  nombre: string;
  tipo: TipoPlan;
  diasPorSemana: number | null;
  incluyeGimnasio: boolean;
  periodicidad: 'MENSUAL' | 'POR_SESION';
  diaLimitePago: number | null;
  descripcion: string | null;
  creadoPor: number;
}

export interface CambiosPlan {
  nombre?: string;
  diaLimitePago?: number;
  /** Texto vacío borra la descripción; undefined la deja igual. */
  descripcion?: string;
}

const COLUMNAS_PLAN = `p.id, p.nombre, p.tipo,
  p.dias_por_semana AS "diasPorSemana",
  p.incluye_gimnasio AS "incluyeGimnasio",
  p.periodicidad,
  p.dia_limite_pago AS "diaLimitePago",
  p.descripcion,
  p.estado`;

/** Escapa los comodines de LIKE para buscar el texto tal como lo escribió el usuario. */
function patronBusqueda(texto: string): string {
  return `%${texto.trim().replace(/[\\%_]/g, '\\$&')}%`;
}

@Injectable()
export class PlanesRepository {
  /** Plan por id; con `bloquear` lo reserva hasta el fin de la transacción. */
  async obtener(consultor: Consultor, planId: number, bloquear = false): Promise<Plan | null> {
    const { rows } = await consultor.query<Plan>(
      `SELECT ${COLUMNAS_PLAN} FROM plan p WHERE p.id = $1 ${bloquear ? 'FOR UPDATE' : ''}`,
      [planId],
    );
    return rows[0] ?? null;
  }

  /** Tarifa del plan vigente en `fecha` (la de vigente_desde más reciente que no la supera). */
  async tarifaVigente(consultor: Consultor, planId: number, fecha: string): Promise<Tarifa | null> {
    const { rows } = await consultor.query<Tarifa>(
      `SELECT id, valor, vigente_desde AS "vigenteDesde"
       FROM tarifa
       WHERE plan_id = $1 AND vigente_desde <= $2
       ORDER BY vigente_desde DESC
       LIMIT 1`,
      [planId, fecha],
    );
    return rows[0] ?? null;
  }

  /**
   * Planes con su tarifa vigente y la próxima programada a la fecha `hoy`, los
   * patinadores que lo tienen hoy y su última modificación (auditoría).
   */
  async listar(
    consultor: Consultor,
    hoy: string,
    filtros: FiltrosListadoPlanes = {},
  ): Promise<PlanConTarifas[]> {
    const { rows } = await consultor.query<PlanConTarifas>(
      `SELECT ${COLUMNAS_PLAN},
              tv.valor AS "tarifaVigenteValor",
              tv.vigente_desde AS "tarifaVigenteDesde",
              tp.valor AS "tarifaProgramadaValor",
              tp.vigente_desde AS "tarifaProgramadaDesde",
              (SELECT count(*)::int FROM asignacion_plan a
                WHERE a.plan_id = p.id AND a.fecha_inicio <= $1
                  AND (a.fecha_fin IS NULL OR a.fecha_fin >= $1)) AS patinadores,
              um.usuario AS "modificadoPor",
              um.creado_en AS "modificadoEn"
       FROM plan p
       LEFT JOIN LATERAL (
         SELECT valor, vigente_desde FROM tarifa
         WHERE plan_id = p.id AND vigente_desde <= $1
         ORDER BY vigente_desde DESC LIMIT 1
       ) tv ON true
       LEFT JOIN LATERAL (
         SELECT valor, vigente_desde FROM tarifa
         WHERE plan_id = p.id AND vigente_desde > $1
         ORDER BY vigente_desde LIMIT 1
       ) tp ON true
       LEFT JOIN LATERAL (
         SELECT u.nombres || ' ' || u.apellidos AS usuario, au.creado_en
         FROM auditoria au LEFT JOIN usuario u ON u.id = au.usuario_id
         WHERE au.tabla = 'plan' AND au.registro_id = p.id
         ORDER BY au.creado_en DESC, au.id DESC LIMIT 1
       ) um ON true
       WHERE ($2::bigint IS NULL OR p.id = $2)
         AND ($3::text IS NULL OR p.tipo = $3)
         AND ($4::text IS NULL OR p.estado = $4)
         AND ($5::text IS NULL OR p.nombre ILIKE $5)
         AND (NOT $6 OR (p.estado = 'ACTIVO' AND tv.valor IS NOT NULL))
       ORDER BY p.estado, p.nombre`,
      [
        hoy,
        filtros.id ?? null,
        filtros.tipo ?? null,
        filtros.estado ?? null,
        filtros.buscar?.trim() ? patronBusqueda(filtros.buscar) : null,
        filtros.soloOfertables ?? false,
      ],
    );
    return rows;
  }

  /** ¿Hay otro plan con ese nombre, sin distinguir mayúsculas? */
  async existeNombre(consultor: Consultor, nombre: string, excluirId?: number): Promise<boolean> {
    const { rows } = await consultor.query<{ existe: boolean }>(
      `SELECT EXISTS (
         SELECT 1 FROM plan WHERE lower(nombre) = lower($1) AND id <> COALESCE($2, 0)
       ) AS existe`,
      [nombre.trim(), excluirId ?? null],
    );
    return rows[0].existe;
  }

  async crear(consultor: Consultor, datos: NuevoPlan): Promise<number> {
    const { rows } = await consultor.query<{ id: number }>(
      `INSERT INTO plan (nombre, tipo, dias_por_semana, incluye_gimnasio, periodicidad,
                         dia_limite_pago, descripcion, creado_por)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [
        datos.nombre,
        datos.tipo,
        datos.diasPorSemana,
        datos.incluyeGimnasio,
        datos.periodicidad,
        datos.diaLimitePago,
        datos.descripcion,
        datos.creadoPor,
      ],
    );
    return rows[0].id;
  }

  async actualizar(consultor: Consultor, planId: number, cambios: CambiosPlan): Promise<void> {
    await consultor.query(
      `UPDATE plan
       SET nombre = COALESCE($2, nombre),
           dia_limite_pago = COALESCE($3, dia_limite_pago),
           descripcion = CASE WHEN $4::text IS NULL THEN descripcion ELSE NULLIF(trim($4), '') END
       WHERE id = $1`,
      [planId, cambios.nombre?.trim() ?? null, cambios.diaLimitePago ?? null, cambios.descripcion ?? null],
    );
  }

  async desactivar(consultor: Consultor, planId: number): Promise<void> {
    await consultor.query(
      `UPDATE plan SET estado = 'INACTIVO', desactivado_en = now() WHERE id = $1`,
      [planId],
    );
  }

  /** Todas las tarifas registradas del plan, con quién y cuándo las registró. */
  async tarifas(consultor: Consultor, planId: number): Promise<TarifaRegistrada[]> {
    const { rows } = await consultor.query<TarifaRegistrada>(
      `SELECT t.id, t.valor, t.vigente_desde AS "vigenteDesde",
              u.nombres || ' ' || u.apellidos AS "registradoPor",
              t.registrado_en AS "registradoEn"
       FROM tarifa t JOIN usuario u ON u.id = t.registrado_por
       WHERE t.plan_id = $1
       ORDER BY t.vigente_desde`,
      [planId],
    );
    return rows;
  }

  async existeTarifaDesde(consultor: Consultor, planId: number, vigenteDesde: string): Promise<boolean> {
    const { rows } = await consultor.query<{ existe: boolean }>(
      `SELECT EXISTS (SELECT 1 FROM tarifa WHERE plan_id = $1 AND vigente_desde = $2) AS existe`,
      [planId, vigenteDesde],
    );
    return rows[0].existe;
  }

  async crearTarifa(
    consultor: Consultor,
    datos: { planId: number; valor: number; vigenteDesde: string; registradoPor: number },
  ): Promise<number> {
    const { rows } = await consultor.query<{ id: number }>(
      `INSERT INTO tarifa (plan_id, valor, vigente_desde, registrado_por)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [datos.planId, datos.valor, datos.vigenteDesde, datos.registradoPor],
    );
    return rows[0].id;
  }
}
