import { Injectable } from '@nestjs/common';
import type { Consultor } from '../../../common/database/base-datos.service.js';

export interface NuevaSesion {
  usuarioId: number;
  tokenHash: string;
  expiraEn: Date;
  ip: string | null;
  userAgent: string | null;
}

/** Sesiones iniciadas (HU-M1-02) y cerradas (HU-M1-03). Solo se guarda el hash del token. */
@Injectable()
export class SesionesRepository {
  async crear(consultor: Consultor, nueva: NuevaSesion): Promise<void> {
    await consultor.query(
      `INSERT INTO sesion (usuario_id, refresh_token_hash, ip, user_agent, expira_en)
       VALUES ($1, $2, $3::inet, $4, $5)`,
      [nueva.usuarioId, nueva.tokenHash, nueva.ip, nueva.userAgent, nueva.expiraEn],
    );
  }

  /**
   * Marca como cerrada la sesión abierta con ese token (HU-M1-03). Devuelve
   * false si no había una sesión abierta, p. ej. si ya estaba cerrada.
   */
  async cerrar(consultor: Consultor, tokenHash: string): Promise<boolean> {
    const resultado = await consultor.query(
      `UPDATE sesion
          SET cerrada_en = now()
        WHERE refresh_token_hash = $1
          AND cerrada_en IS NULL`,
      [tokenHash],
    );
    return (resultado.rowCount ?? 0) > 0;
  }
}