import {
  createParamDecorator,
  ExecutionContext,
  SetMetadata,
} from '@nestjs/common';
import type {
  Rol,
  SolicitudAutenticada,
  UsuarioAutenticado,
} from './usuario-autenticado.js';

export const PERMISOS_KEY = 'permisos';
export const ROLES_KEY = 'roles';

/**
 * Exige al usuario al menos uno de los roles indicados (tabla rol, HU-M1-07).
 * Para acciones propias de un rol (p. ej. crear cuentas, solo el Administrador).
 * Para acciones que se reparten por permiso, usar RequierePermiso.
 */
export const Roles = (...roles: Rol[]) => SetMetadata(ROLES_KEY, roles);

/** Exige al usuario al menos uno de los permisos indicados (tabla permiso). */
export const RequierePermiso = (...permisos: string[]) =>
  SetMetadata(PERMISOS_KEY, permisos);

/** Inyecta en el controlador el usuario que dejó el guard de autenticación. */
export const UsuarioActual = createParamDecorator(
  (_dato: unknown, contexto: ExecutionContext): UsuarioAutenticado => {
    const solicitud = contexto.switchToHttp().getRequest<SolicitudAutenticada>();
    return solicitud.usuario as UsuarioAutenticado;
  },
);