import { Injectable } from '@nestjs/common';
import type { Consultor } from '../../../common/database/base-datos.service.js';

export interface PerfilNivelActual {
  id: number;
  nombre: string;
  nivelActual: { nombre: string; orden: number; desde: string } | null;
}

@Injectable()
export class NivelActualRepository {
  async listarPerfilesConsultables(consultor: Consultor, usuarioId: number, administrador: boolean): Promise<PerfilNivelActual[]> {
    const { rows } = await consultor.query<PerfilNivelActual>(
      `SELECT p.id, p.nombres || ' ' || p.apellidos AS nombre,
              CASE WHEN n.id IS NULL THEN NULL ELSE json_build_object(
                'nombre', n.nombre, 'orden', n.orden, 'desde', pn.desde
              ) END AS "nivelActual"
       FROM patinador p
       LEFT JOIN patinador_nivel pn ON pn.patinador_id = p.id AND pn.hasta IS NULL
       LEFT JOIN nivel n ON n.id = pn.nivel_id
       WHERE p.activo AND (
         $2::boolean
         OR p.usuario_id = $1
         OR EXISTS (
           SELECT 1 FROM acudiente_patinador ap
           WHERE ap.patinador_id = p.id AND ap.acudiente_id = $1 AND ap.desvinculado_en IS NULL
         )
       )
       ORDER BY p.apellidos, p.nombres
       LIMIT 100`,
      [usuarioId, administrador],
    );
    return rows;
  }

  async buscarPerfilConsultable(
    consultor: Consultor,
    patinadorId: number,
    usuarioId: number,
    administrador: boolean,
  ): Promise<PerfilNivelActual | null> {
    const { rows } = await consultor.query<PerfilNivelActual>(
      `SELECT p.id, p.nombres || ' ' || p.apellidos AS nombre,
              CASE WHEN n.id IS NULL THEN NULL ELSE json_build_object(
                'nombre', n.nombre, 'orden', n.orden, 'desde', pn.desde
              ) END AS "nivelActual"
       FROM patinador p
       LEFT JOIN patinador_nivel pn ON pn.patinador_id = p.id AND pn.hasta IS NULL
       LEFT JOIN nivel n ON n.id = pn.nivel_id
       WHERE p.id = $1 AND p.activo AND (
         $3::boolean
         OR p.usuario_id = $2
         OR EXISTS (
           SELECT 1 FROM acudiente_patinador ap
           WHERE ap.patinador_id = p.id AND ap.acudiente_id = $2 AND ap.desvinculado_en IS NULL
         )
       )`,
      [patinadorId, usuarioId, administrador],
    );
    return rows[0] ?? null;
  }
}
