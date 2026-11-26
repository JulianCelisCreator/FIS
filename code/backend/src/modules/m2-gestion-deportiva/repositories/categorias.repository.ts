import { Injectable } from '@nestjs/common';
import type { Consultor } from '../../../common/database/base-datos.service.js';

export interface CategoriaClub {
  id: number;
  nombre: string;
  edadMinima: number;
  edadMaxima: number | null;
  genero: 'FEMENINO' | 'MASCULINO' | 'MIXTO';
  nivelMinimo: { id: number; nombre: string; orden: number } | null;
  activo: boolean;
  patinadoresAsignados: number;
}

const SELECT_CATEGORIA = `
  SELECT c.id, c.nombre, c.edad_minima AS "edadMinima", c.edad_maxima AS "edadMaxima", c.genero, c.activo,
         CASE WHEN n.id IS NULL THEN NULL
              ELSE json_build_object('id', n.id, 'nombre', n.nombre, 'orden', n.orden) END AS "nivelMinimo",
         (SELECT count(*)::int FROM patinador_categoria pc WHERE pc.categoria_id = c.id AND pc.hasta IS NULL)
           AS "patinadoresAsignados"
  FROM categoria c
  LEFT JOIN nivel n ON n.id = c.nivel_minimo_id`;

@Injectable()
export class CategoriasRepository {
  async listar(db: Consultor, soloActivas: boolean): Promise<CategoriaClub[]> {
    const { rows } = await db.query<CategoriaClub>(
      `${SELECT_CATEGORIA}
       WHERE (NOT $1::boolean OR c.activo)
       ORDER BY c.edad_minima, c.nombre`,
      [soloActivas],
    );
    return rows;
  }

  async buscar(db: Consultor, id: number): Promise<CategoriaClub | null> {
    const { rows } = await db.query<CategoriaClub>(`${SELECT_CATEGORIA} WHERE c.id = $1`, [id]);
    return rows[0] ?? null;
  }

  async nivelActivoExiste(db: Consultor, nivelId: number): Promise<boolean> {
    const { rows } = await db.query<{ existe: boolean }>(
      'SELECT EXISTS (SELECT 1 FROM nivel WHERE id = $1 AND activo) AS existe', [nivelId],
    );
    return rows[0]?.existe ?? false;
  }

  async crear(
    db: Consultor,
    datos: { nombre: string; edadMinima: number; edadMaxima: number | null; nivelMinimoId: number | null; genero: string },
  ): Promise<number> {
    const { rows } = await db.query<{ id: number }>(
      `INSERT INTO categoria (nombre, edad_minima, edad_maxima, nivel_minimo_id, genero)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [datos.nombre, datos.edadMinima, datos.edadMaxima, datos.nivelMinimoId, datos.genero],
    );
    return rows[0].id;
  }

  async actualizar(
    db: Consultor,
    id: number,
    datos: { nombre: string; edadMinima: number; edadMaxima: number | null; nivelMinimoId: number | null; genero: string; activo: boolean },
  ): Promise<void> {
    await db.query(
      `UPDATE categoria
       SET nombre = $2, edad_minima = $3, edad_maxima = $4, nivel_minimo_id = $5, genero = $6,
           activo = $7, actualizado_en = now()
       WHERE id = $1`,
      [id, datos.nombre, datos.edadMinima, datos.edadMaxima, datos.nivelMinimoId, datos.genero, datos.activo],
    );
  }

  /** Niveles activos en orden, para el catálogo del club (RF-M2-17). */
  async listarNivelesActivos(db: Consultor): Promise<{ id: number; nombre: string; descripcion: string | null; orden: number }[]> {
    const { rows } = await db.query<{ id: number; nombre: string; descripcion: string | null; orden: number }>(
      'SELECT id, nombre, descripcion, orden FROM nivel WHERE activo ORDER BY orden',
    );
    return rows;
  }
}
