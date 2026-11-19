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

  /**
   * HU-M1-08: cierra las sesiones abiertas de la cuenta al cambiar la
   * contraseña. Con exceptoTokenHash conserva la sesión desde la que se hizo
   * el cambio. Devuelve cuántas cerró.
   */
  async cerrarDeUsuario(consultor: Consultor, usuarioId: number, exceptoTokenHash: string | null = null): Promise<number> {
    const resultado = await consultor.query(
      `UPDATE sesion
          SET cerrada_en = now()
        WHERE usuario_id = $1
          AND cerrada_en IS NULL
          AND ($2::text IS NULL OR refresh_token_hash <> $2)`,
      [usuarioId, exceptoTokenHash],
    );
    return resultado.rowCount ?? 0;
  }
}
