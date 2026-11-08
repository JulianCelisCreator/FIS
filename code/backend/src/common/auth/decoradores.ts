import {
  createParamDecorator,
  ExecutionContext,
  SetMetadata,
} from '@nestjs/common';
import type {
  SolicitudAutenticada,
  UsuarioAutenticado,
} from './usuario-autenticado.js';

export const PERMISOS_KEY = 'permisos';

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
