import { Injectable } from '@nestjs/common';
import type { Consultor } from '../../../common/database/base-datos.service.js';
import type { ContextoPatinador } from '../validators/acceso-patinador.validator.js';

/**
 * Lecturas de M2 (patinador) y M1 (vínculo con acudientes) que M5 necesita para
 * validar permisos. Solo lee: el registro de patinadores es de M2.
 */
@Injectable()
export class PatinadoresRepository {
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
