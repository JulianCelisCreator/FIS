import { Injectable } from '@nestjs/common';
import type { Consultor } from '../../../common/database/base-datos.service.js';
import type { ReglasCategoria } from '../utils/reglas-categoria.js';

export interface PatinadorParaCategoria {
  id: number;
  nombre: string;
  fechaNacimiento: string;
  genero: 'FEMENINO' | 'MASCULINO';
  nivelActualOrden: number | null;
  nivelActual: string | null;
}

export interface CategoriaActual {
  filaId: number;
  categoriaId: number;
  categoria: string;
  desde: string;
}

export interface CategoriaConId extends ReglasCategoria {
  id: number;
  activo: boolean;
}

export interface PropuestaCategoria {
  id: number;
  patinadorId: number;
  patinador: string;
  categoriaActualId: number;
  categoriaActual: string;
  categoriaPropuestaId: number;
  categoriaPropuesta: string;
  justificacion: string;
  estado: 'PROPUESTA' | 'APROBADA' | 'RECHAZADA';
  propuestaPor: number;
  propuestaPorNombre: string;
  propuestaEn: Date;
  resueltaEn: Date | null;
}

const SELECT_PROPUESTA = `
  SELECT pr.id, pr.patinador_id AS "patinadorId", pt.nombres || ' ' || pt.apellidos AS patinador,
         pr.categoria_actual_id AS "categoriaActualId", ca.nombre AS "categoriaActual",
         pr.categoria_propuesta_id AS "categoriaPropuestaId", cp.nombre AS "categoriaPropuesta",
         pr.justificacion, pr.estado, pr.propuesta_por AS "propuestaPor",
         u.nombres || ' ' || u.apellidos AS "propuestaPorNombre",
         pr.propuesta_en AS "propuestaEn", pr.resuelta_en AS "resueltaEn"
  FROM propuesta_cambio_categoria pr
  JOIN patinador pt ON pt.id = pr.patinador_id
  JOIN categoria ca ON ca.id = pr.categoria_actual_id
  JOIN categoria cp ON cp.id = pr.categoria_propuesta_id
  JOIN usuario u ON u.id = pr.propuesta_por`;

@Injectable()
export class AsignacionesRepository {
  /** Bloquea la fila del patinador para serializar cambios simultáneos de nivel y categoría. */
  async bloquearPatinador(db: Consultor, patinadorId: number): Promise<PatinadorParaCategoria | null> {
    const { rows } = await db.query<PatinadorParaCategoria>(
      `SELECT p.id, p.nombres || ' ' || p.apellidos AS nombre, p.fecha_nacimiento AS "fechaNacimiento", p.genero,
              n.orden AS "nivelActualOrden", n.nombre AS "nivelActual"
       FROM patinador p
       LEFT JOIN patinador_nivel pn ON pn.patinador_id = p.id AND pn.hasta IS NULL
       LEFT JOIN nivel n ON n.id = pn.nivel_id
       WHERE p.id = $1 AND p.activo
       FOR UPDATE OF p`,
      [patinadorId],
    );
    return rows[0] ?? null;
  }

  async buscarCategoria(db: Consultor, categoriaId: number): Promise<CategoriaConId | null> {
    const { rows } = await db.query<CategoriaConId>(
      `SELECT c.id, c.nombre, c.edad_minima AS "edadMinima", c.edad_maxima AS "edadMaxima", c.genero, c.activo,
              n.orden AS "nivelMinimoOrden", n.nombre AS "nivelMinimoNombre"
       FROM categoria c LEFT JOIN nivel n ON n.id = c.nivel_minimo_id
       WHERE c.id = $1`,
      [categoriaId],
    );
    return rows[0] ?? null;
  }

  async categoriaActual(db: Consultor, patinadorId: number): Promise<CategoriaActual | null> {
    const { rows } = await db.query<CategoriaActual>(
      `SELECT pc.id AS "filaId", pc.categoria_id AS "categoriaId", c.nombre AS categoria, pc.desde
       FROM patinador_categoria pc JOIN categoria c ON c.id = pc.categoria_id
       WHERE pc.patinador_id = $1 AND pc.hasta IS NULL`,
      [patinadorId],
    );
    return rows[0] ?? null;
  }

  /** ¿Hay una evaluación APROBADA desde la fecha dada (inclusive)? Es el «avance de nivel aprobado». */
  async hayAvanceAprobado(db: Consultor, patinadorId: number, desde: string): Promise<boolean> {
    const { rows } = await db.query<{ existe: boolean }>(
      `SELECT EXISTS (
         SELECT 1 FROM evaluacion_nivel
         WHERE patinador_id = $1 AND resultado = 'APROBADO' AND fecha >= $2::date
       ) AS existe`,
      [patinadorId, desde],
    );
    return rows[0]?.existe ?? false;
  }

  async cerrarCategoria(db: Consultor, filaId: number, hasta: string): Promise<void> {
    await db.query('UPDATE patinador_categoria SET hasta = $2 WHERE id = $1', [filaId, hasta]);
  }

  async abrirCategoria(
    db: Consultor,
    datos: { patinadorId: number; categoriaId: number; desde: string; motivo: string | null; propuestaId: number | null; asignadoPor: number },
  ): Promise<number> {
    const { rows } = await db.query<{ id: number }>(
      `INSERT INTO patinador_categoria (patinador_id, categoria_id, desde, motivo, propuesta_id, asignado_por)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [datos.patinadorId, datos.categoriaId, datos.desde, datos.motivo, datos.propuestaId, datos.asignadoPor],
    );
    return rows[0].id;
  }

  /** Patinadores activos con su nivel y categoría vigentes, para la pantalla del administrador. */
  async listarParaAsignar(db: Consultor, buscar: string | null) {
    const texto = buscar ? `%${buscar.replace(/[\\%_]/g, '\\$&')}%` : null;
    const { rows } = await db.query<{
      id: number; nombre: string; fechaNacimiento: string; genero: string;
      nivelActual: string | null; categoriaActual: string | null; categoriaDesde: string | null; propuestaPendiente: boolean;
    }>(
      `SELECT p.id, p.nombres || ' ' || p.apellidos AS nombre, p.fecha_nacimiento AS "fechaNacimiento", p.genero,
              n.nombre AS "nivelActual", c.nombre AS "categoriaActual", pc.desde AS "categoriaDesde",
              EXISTS (SELECT 1 FROM propuesta_cambio_categoria pr
                      WHERE pr.patinador_id = p.id AND pr.estado = 'PROPUESTA') AS "propuestaPendiente"
       FROM patinador p
       LEFT JOIN patinador_nivel pn ON pn.patinador_id = p.id AND pn.hasta IS NULL
       LEFT JOIN nivel n ON n.id = pn.nivel_id
       LEFT JOIN patinador_categoria pc ON pc.patinador_id = p.id AND pc.hasta IS NULL
       LEFT JOIN categoria c ON c.id = pc.categoria_id
       WHERE p.activo AND ($1::text IS NULL OR (p.nombres || ' ' || p.apellidos) ILIKE $1 OR p.numero_documento ILIKE $1)
       ORDER BY p.apellidos, p.nombres
       LIMIT 100`,
      [texto],
    );
    return rows;
  }

  async hayPropuestaPendiente(db: Consultor, patinadorId: number): Promise<boolean> {
    const { rows } = await db.query<{ existe: boolean }>(
      `SELECT EXISTS (SELECT 1 FROM propuesta_cambio_categoria WHERE patinador_id = $1 AND estado = 'PROPUESTA') AS existe`,
      [patinadorId],
    );
    return rows[0]?.existe ?? false;
  }

  async crearPropuesta(
    db: Consultor,
    datos: { patinadorId: number; actualId: number; propuestaId: number; justificacion: string; propuestaPor: number; estado: 'PROPUESTA' | 'APROBADA'; fechaEfectiva: string | null },
  ): Promise<number> {
    const resuelta = datos.estado === 'APROBADA';
    const { rows } = await db.query<{ id: number }>(
      `INSERT INTO propuesta_cambio_categoria
         (patinador_id, categoria_actual_id, categoria_propuesta_id, justificacion, fecha_efectiva, estado,
          propuesta_por, resuelta_por, resuelta_en)
       VALUES ($1, $2, $3, $4, $5::date, $6, $7::bigint, CASE WHEN $8::boolean THEN $7::bigint END, CASE WHEN $8::boolean THEN now() END)
       RETURNING id`,
      [datos.patinadorId, datos.actualId, datos.propuestaId, datos.justificacion, datos.fechaEfectiva,
        datos.estado, datos.propuestaPor, resuelta],
    );
    return rows[0].id;
  }

  async listarPropuestas(db: Consultor, filtro: { estado: string | null; proponenteId: number | null }): Promise<PropuestaCategoria[]> {
    const { rows } = await db.query<PropuestaCategoria>(
      `${SELECT_PROPUESTA}
       WHERE ($1::text IS NULL OR pr.estado = $1) AND ($2::bigint IS NULL OR pr.propuesta_por = $2)
       ORDER BY (pr.estado = 'PROPUESTA') DESC, pr.propuesta_en DESC
       LIMIT 200`,
      [filtro.estado, filtro.proponenteId],
    );
    return rows;
  }

  /** Bloquea la propuesta para que dos administradores no la resuelvan a la vez. */
  async bloquearPropuesta(db: Consultor, id: number): Promise<{ id: number; patinadorId: number; categoriaActualId: number; categoriaPropuestaId: number; justificacion: string; estado: string } | null> {
    const { rows } = await db.query<{ id: number; patinadorId: number; categoriaActualId: number; categoriaPropuestaId: number; justificacion: string; estado: string }>(
      `SELECT id, patinador_id AS "patinadorId", categoria_actual_id AS "categoriaActualId",
              categoria_propuesta_id AS "categoriaPropuestaId", justificacion, estado
       FROM propuesta_cambio_categoria WHERE id = $1 FOR UPDATE`,
      [id],
    );
    return rows[0] ?? null;
  }

  async resolverPropuesta(db: Consultor, id: number, estado: 'APROBADA' | 'RECHAZADA', usuarioId: number, fechaEfectiva: string | null): Promise<void> {
    await db.query(
      `UPDATE propuesta_cambio_categoria
       SET estado = $2, resuelta_por = $3, resuelta_en = now(), fecha_efectiva = $4
       WHERE id = $1`,
      [id, estado, usuarioId, fechaEfectiva],
    );
  }
}
