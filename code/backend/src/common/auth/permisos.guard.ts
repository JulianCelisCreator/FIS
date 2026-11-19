import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISOS_KEY } from './decoradores.js';
import type { SolicitudAutenticada } from './usuario-autenticado.js';

/** Control de acceso por permiso (M1-07). Va después del guard de autenticación. */
@Injectable()
export class PermisosGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(contexto: ExecutionContext): boolean {
    const requeridos = this.reflector.getAllAndOverride<string[] | undefined>(
      PERMISOS_KEY,
      [contexto.getHandler(), contexto.getClass()],
    );
    if (!requeridos || requeridos.length === 0) {
      return true;
    }

    const { usuario } = contexto.switchToHttp().getRequest<SolicitudAutenticada>();
    if (!usuario || !requeridos.some((permiso) => usuario.permisos.includes(permiso))) {
      throw new ForbiddenException('No tienes permiso para realizar esta acción');
    }
    return true;
  }
}
