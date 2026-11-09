import { Injectable } from '@nestjs/common';
import type { Consultor } from '../../../common/database/base-datos.service.js';

export interface NuevaSesion {
  usuarioId: number;
  tokenHash: string;
  expiraEn: Date;
  ip: string | null;
  userAgent: string | null;
}

/** Sesiones iniciadas (RF-M1-02) y cerradas (RF-M1-03). Solo se guarda el hash del token. */
@Injectable()
export class SesionesRepository {
  async crear(consultor: Consultor, nueva: NuevaSesion): Promise<number> {
    const { rows } = await consultor.query<{ id: number }>(
      `INSERT INTO sesion (usuario_id, refresh_token_hash, ip, user_agent, expira_en)
       VALUES ($1, $2, $3::inet, $4, $5)
       RETURNING id`,
      [nueva.usuarioId, nueva.tokenHash, nueva.ip, nueva.userAgent, nueva.expiraEn],
    );
    return rows[0].id;
  }

  /** Cierra la sesión del token si sigue abierta. Cerrar dos veces no hace nada. */
  async cerrarPorToken(consultor: Consultor, tokenHash: string): Promise<void> {
    await consultor.query(
      `UPDATE sesion SET cerrada_en = now() WHERE refresh_token_hash = $1 AND cerrada_en IS NULL`,
      [tokenHash],
    );
  }
}
