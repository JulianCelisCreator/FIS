import { Injectable } from '@nestjs/common';
import { hashTokenSesion } from '../../../common/auth/token-sesion.js';
import { BaseDatosService } from '../../../common/database/base-datos.service.js';
import { SesionesRepository } from '../repositories/sesiones.repository.js';

/**
 * HU-M1-03 · Cierre de sesión. Invalida en la base de datos la sesión de la
 * cookie, así que el token deja de servir aunque alguien lo haya copiado. Es
 * idempotente: cerrar una sesión que ya está cerrada, vencida o que no existe
 * no es un error, porque el resultado que la persona espera (quedar sin
 * sesión) ya se cumple.
 */
@Injectable()
export class CierreSesionService {
  constructor(
    private readonly baseDatos: BaseDatosService,
    private readonly sesiones: SesionesRepository,
  ) {}

  /** Cierra la sesión del token y dice si había una abierta. Sin token no hace nada. */
  async cerrar(token: string | null): Promise<boolean> {
    if (!token) return false;
    return this.sesiones.cerrar(this.baseDatos.consultor, hashTokenSesion(token));
  }
}