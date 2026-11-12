import { Injectable } from '@nestjs/common';
import type { Consultor } from '../../../common/database/base-datos.service.js';

export interface NuevaSesion {
  usuarioId: number;
  tokenHash: string;
  expiraEn: Date;
  ip: string | null;
  userAgent: string | null;
}

/** Sesiones iniciadas (HU-M1-02). Solo se guarda el hash del token. */
@Injectable()
export class SesionesRepository {
  async crear(consultor: Consultor, nueva: NuevaSesion): Promise<void> {
    await consultor.query(
      `INSERT INTO sesion (usuario_id, refresh_token_hash, ip, user_agent, expira_en)
       VALUES ($1, $2, $3::inet, $4, $5)`,
      [nueva.usuarioId, nueva.tokenHash, nueva.ip, nueva.userAgent, nueva.expiraEn],
    );
  }
}
