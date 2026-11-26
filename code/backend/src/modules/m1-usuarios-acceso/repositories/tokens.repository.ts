import { Injectable } from '@nestjs/common';
import type { Consultor } from '../../../common/database/base-datos.service.js';

export type TipoToken = 'VERIFICACION_CORREO' | 'RECUPERACION_CONTRASENA';

export interface TokenVigente {
  id: number;
  usuarioId: number;
}

/** Un token en cualquier estado, para explicar por qué no sirve (HU-M1-04 CA-03). */
export interface TokenEncontrado extends TokenVigente {
  usado: boolean;
  vencido: boolean;
}

/**
 * Enlaces de un solo uso (tabla token_usuario): recuperación de contraseña
 * (HU-M1-08) y verificación de correo (HU-M1-04). Solo se guarda el hash del
 * token, nunca el token.
 */
@Injectable()
export class TokensRepository {
  async crear(consultor: Consultor, usuarioId: number, tipo: TipoToken, tokenHash: string, expiraEn: Date): Promise<void> {
    await consultor.query(
      `INSERT INTO token_usuario (usuario_id, tipo, token_hash, expira_en) VALUES ($1, $2, $3, $4)`,
      [usuarioId, tipo, tokenHash, expiraEn],
    );
  }

  /** Anula los enlaces pendientes del mismo tipo: solo vale el último que se pidió. */
  async anularPendientes(consultor: Consultor, usuarioId: number, tipo: TipoToken): Promise<void> {
    await consultor.query(
      `UPDATE token_usuario SET usado_en = now()
       WHERE usuario_id = $1 AND tipo = $2 AND usado_en IS NULL`,
      [usuarioId, tipo],
    );
  }

  /** Cuántos enlaces de ese tipo se pidieron en la ventana dada (límite de solicitudes). */
  async contarRecientes(consultor: Consultor, usuarioId: number, tipo: TipoToken, desde: Date): Promise<number> {
    const { rows } = await consultor.query<{ total: number }>(
      `SELECT count(*)::int AS total FROM token_usuario
       WHERE usuario_id = $1 AND tipo = $2 AND creado_en >= $3`,
      [usuarioId, tipo, desde],
    );
    return rows[0].total;
  }

  /**
   * El enlace sin usar y sin vencer con ese hash, bloqueado para usarlo en la
   * misma transacción (dos clics simultáneos no lo usan dos veces).
   */
  async buscarVigente(consultor: Consultor, tokenHash: string, tipo: TipoToken): Promise<TokenVigente | null> {
    const { rows } = await consultor.query<TokenVigente>(
      `SELECT id, usuario_id AS "usuarioId" FROM token_usuario
       WHERE token_hash = $1 AND tipo = $2 AND usado_en IS NULL AND expira_en > now()
       FOR UPDATE`,
      [tokenHash, tipo],
    );
    return rows[0] ?? null;
  }

  /**
   * El token con ese hash aunque esté usado o vencido, bloqueado para usarlo en
   * la misma transacción. null si no existe.
   */
  async buscarPorHash(consultor: Consultor, tokenHash: string, tipo: TipoToken): Promise<TokenEncontrado | null> {
    const { rows } = await consultor.query<TokenEncontrado>(
      `SELECT id, usuario_id AS "usuarioId", usado_en IS NOT NULL AS usado, expira_en <= now() AS vencido
       FROM token_usuario
       WHERE token_hash = $1 AND tipo = $2
       FOR UPDATE`,
      [tokenHash, tipo],
    );
    return rows[0] ?? null;
  }

  async marcarUsado(consultor: Consultor, tokenId: number): Promise<void> {
    await consultor.query(`UPDATE token_usuario SET usado_en = now() WHERE id = $1`, [tokenId]);
  }
}
