import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './decoradores.js';
import type { Rol, SolicitudAutenticada } from './usuario-autenticado.js';

export const MENSAJE_SIN_ROL = 'No tienes permiso para realizar esta acción';

/**
 * Control de acceso por rol (HU-M1-07). Va después del guard de autenticación:
 * deja pasar si la ruta no declara @Roles o si el usuario tiene al menos uno de
 * los roles pedidos; en cualquier otro caso responde 403.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(contexto: ExecutionContext): boolean {
    const requeridos = this.reflector.getAllAndOverride<Rol[] | undefined>(ROLES_KEY, [
      contexto.getHandler(),
      contexto.getClass(),
    ]);
    if (!requeridos || requeridos.length === 0) {
      return true;
    }

    const { usuario } = contexto.switchToHttp().getRequest<SolicitudAutenticada>();
    if (!usuario || !requeridos.some((rol) => usuario.roles.includes(rol))) {
      throw new ForbiddenException(MENSAJE_SIN_ROL);
    }
    return true;
  }
}