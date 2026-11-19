import { Injectable } from '@nestjs/common';
import type { Consultor } from '../../../common/database/base-datos.service.js';

export interface NivelDePatinaje {
  id: number;
  nombre: string;
  descripcion: string | null;
  orden: number;
  activo: boolean;
  patinadoresAsignados: number;
  actualizadoEn: Date;
}

@Injectable()
export class NivelesRepository {
  async listar(consultor: Consultor): Promise<NivelDePatinaje[]> {
    const { rows } = await consultor.query<NivelDePatinaje>(
      `SELECT n.id, n.nombre, n.descripcion, n.orden, n.activo,
              count(DISTINCT pn.patinador_id) FILTER (WHERE pn.hasta IS NULL)::int AS "patinadoresAsignados",
              n.actualizado_en AS "actualizadoEn"
       FROM nivel n
       LEFT JOIN patinador_nivel pn ON pn.nivel_id = n.id
       GROUP BY n.id
       ORDER BY n.orden, n.nombre`,
    );
    return rows;
  }

  async buscar(consultor: Consultor, id: number): Promise<NivelDePatinaje | null> {
    const { rows } = await consultor.query<NivelDePatinaje>(
      `SELECT n.id, n.nombre, n.descripcion, n.orden, n.activo,
              count(DISTINCT pn.patinador_id) FILTER (WHERE pn.hasta IS NULL)::int AS "patinadoresAsignados",
              n.actualizado_en AS "actualizadoEn"
       FROM nivel n LEFT JOIN patinador_nivel pn ON pn.nivel_id = n.id
       WHERE n.id = $1 GROUP BY n.id`,
      [id],
    );
    return rows[0] ?? null;
  }

  async crear(
    consultor: Consultor,
    datos: { nombre: string; descripcion: string | null; orden: number },
  ): Promise<NivelDePatinaje> {
    const { rows } = await consultor.query<NivelDePatinaje>(
      `INSERT INTO nivel (nombre, descripcion, orden)
       VALUES ($1, $2, $3)
       RETURNING id, nombre, descripcion, orden, activo, 0::int AS "patinadoresAsignados",
                 actualizado_en AS "actualizadoEn"`,
      [datos.nombre, datos.descripcion, datos.orden],
    );
    return rows[0];
  }

  async actualizar(
    consultor: Consultor,
    id: number,
    datos: { nombre?: string; descripcion?: string | null; orden?: number; activo?: boolean },
  ): Promise<NivelDePatinaje | null> {
    const descripcionDefinida = Object.hasOwn(datos, 'descripcion');
    const { rows } = await consultor.query<NivelDePatinaje>(
      `UPDATE nivel
       SET nombre = COALESCE($2, nombre),
           descripcion = CASE WHEN $3::boolean THEN $4::text ELSE descripcion END,
           orden = COALESCE($5, orden),
           activo = COALESCE($6, activo),
           actualizado_en = now()
       WHERE id = $1
       RETURNING id, nombre, descripcion, orden, activo,
                 (SELECT count(DISTINCT pn.patinador_id) FILTER (WHERE pn.hasta IS NULL)::int FROM patinador_nivel pn WHERE pn.nivel_id = nivel.id) AS "patinadoresAsignados",
                 actualizado_en AS "actualizadoEn"`,
      [id, datos.nombre ?? null, descripcionDefinida, datos.descripcion ?? null, datos.orden ?? null, datos.activo ?? null],
    );
    return rows[0] ?? null;
  }
}
