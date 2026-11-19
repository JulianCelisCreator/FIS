import { Injectable } from '@nestjs/common';
import type { Consultor } from '../database/base-datos.service.js';

export interface EntradaAuditoria {
  modulo: 'M1' | 'M2' | 'M3' | 'M4' | 'M5' | 'M6';
  tabla: string;
  registroId: number;
  accion: string;
  valorAnterior?: unknown;
  valorNuevo?: unknown;
  motivo?: string | null;
  usuarioId: number | null;
}

/** Bitácora de cambios sensibles (tabla auditoria, regla de negocio 6). Solo inserta. */
@Injectable()
export class AuditoriaRepository {
  async registrar(consultor: Consultor, entrada: EntradaAuditoria): Promise<void> {
    await consultor.query(
      `INSERT INTO auditoria (modulo, tabla, registro_id, accion, valor_anterior, valor_nuevo, motivo, usuario_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        entrada.modulo,
        entrada.tabla,
        entrada.registroId,
        entrada.accion,
        entrada.valorAnterior === undefined ? null : JSON.stringify(entrada.valorAnterior),
        entrada.valorNuevo === undefined ? null : JSON.stringify(entrada.valorNuevo),
        entrada.motivo ?? null,
        entrada.usuarioId,
      ],
    );
  }
}
