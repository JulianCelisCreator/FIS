import { Injectable } from '@nestjs/common';
import type { Consultor } from '../../../common/database/base-datos.service.js';

/**
 * Quién puede ver a qué patinador. El profesor ve a los patinadores matriculados
 * en un grupo que tiene asignado (grupo_profesor «define qué patinadores ve cada
 * profesor», M3-03). El patinador se ve a sí mismo; el acudiente, a sus vinculados.
 */
@Injectable()
export class AlcanceRepository {
  async profesorTienePatinador(db: Consultor, profesorId: number, patinadorId: number): Promise<boolean> {
    const { rows } = await db.query<{ existe: boolean }>(
      `SELECT EXISTS (
         SELECT 1 FROM patinador_grupo pg
         JOIN grupo_profesor gp ON gp.grupo_id = pg.grupo_id AND gp.desasignado_en IS NULL
         JOIN patinador p ON p.id = pg.patinador_id AND p.activo
         WHERE pg.patinador_id = $2 AND pg.hasta IS NULL AND gp.profesor_id = $1
       ) AS existe`,
      [profesorId, patinadorId],
    );
    return rows[0]?.existe ?? false;
  }

  async esElPatinador(db: Consultor, usuarioId: number, patinadorId: number): Promise<boolean> {
    const { rows } = await db.query<{ existe: boolean }>(
      'SELECT EXISTS (SELECT 1 FROM patinador WHERE id = $2 AND usuario_id = $1 AND activo) AS existe',
      [usuarioId, patinadorId],
    );
    return rows[0]?.existe ?? false;
  }
}
