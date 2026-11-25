import { Injectable } from '@nestjs/common';
import type { Consultor } from '../../../common/database/base-datos.service.js';

export interface EntradaTrayectoria {
  tipo: 'NIVEL' | 'CATEGORIA';
  id: number;
  nombre: string;
  desde: string;
  hasta: string | null;
  motivo: string | null;
  vigente: boolean;
}

export interface CategoriaActualDePatinador {
  patinadorId: number;
  nombre: string;
  categoria: { nombre: string; desde: string } | null;
}

@Injectable()
export class HistorialRepository {
  async nombrePatinador(db: Consultor, patinadorId: number): Promise<string | null> {
    const { rows } = await db.query<{ nombre: string }>(
      `SELECT nombres || ' ' || apellidos AS nombre FROM patinador WHERE id = $1 AND activo`, [patinadorId],
    );
    return rows[0]?.nombre ?? null;
  }

  /** Niveles y categorías cursados, del más antiguo al más reciente; nada se sobrescribe (RF-M2-10). */
  async trayectoria(db: Consultor, patinadorId: number): Promise<EntradaTrayectoria[]> {
    const { rows } = await db.query<EntradaTrayectoria>(
      `SELECT * FROM (
         SELECT 'NIVEL' AS tipo, pn.id, n.nombre, pn.desde, pn.hasta, NULL::text AS motivo,
                (pn.hasta IS NULL) AS vigente, pn.creado_en
         FROM patinador_nivel pn JOIN nivel n ON n.id = pn.nivel_id WHERE pn.patinador_id = $1
         UNION ALL
         SELECT 'CATEGORIA', pc.id, c.nombre, pc.desde, pc.hasta, pc.motivo, (pc.hasta IS NULL), pc.creado_en
         FROM patinador_categoria pc JOIN categoria c ON c.id = pc.categoria_id WHERE pc.patinador_id = $1
       ) t
       ORDER BY desde, creado_en, id`,
      [patinadorId],
    );
    return rows.map(({ ...entrada }) => {
      delete (entrada as { creado_en?: unknown }).creado_en;
      return entrada;
    });
  }

  async evaluaciones(db: Consultor, patinadorId: number) {
    const { rows } = await db.query<{ id: number; fecha: string; nivel: string; resultado: string; observacion: string | null; profesor: string }>(
      `SELECT e.id, e.fecha, n.nombre AS nivel, e.resultado, e.observacion, u.nombres || ' ' || u.apellidos AS profesor
       FROM evaluacion_nivel e JOIN nivel n ON n.id = e.nivel_evaluado_id JOIN usuario u ON u.id = e.profesor_id
       WHERE e.patinador_id = $1 ORDER BY e.fecha, e.id`,
      [patinadorId],
    );
    return rows;
  }

  /** Categoría vigente del propio patinador (su cuenta) y de los que tiene a cargo como acudiente (RF-M2-18, RF-M2-21). */
  async categoriaActualDe(db: Consultor, usuarioId: number): Promise<CategoriaActualDePatinador[]> {
    const { rows } = await db.query<CategoriaActualDePatinador>(
      `SELECT p.id AS "patinadorId", p.nombres || ' ' || p.apellidos AS nombre,
              CASE WHEN c.id IS NULL THEN NULL
                   ELSE json_build_object('nombre', c.nombre, 'desde', pc.desde) END AS categoria
       FROM patinador p
       LEFT JOIN patinador_categoria pc ON pc.patinador_id = p.id AND pc.hasta IS NULL
       LEFT JOIN categoria c ON c.id = pc.categoria_id
       WHERE p.activo AND (
         p.usuario_id = $1
         OR EXISTS (SELECT 1 FROM acudiente_patinador ap
                    WHERE ap.patinador_id = p.id AND ap.acudiente_id = $1 AND ap.desvinculado_en IS NULL)
       )
       ORDER BY p.apellidos, p.nombres`,
      [usuarioId],
    );
    return rows;
  }
}
