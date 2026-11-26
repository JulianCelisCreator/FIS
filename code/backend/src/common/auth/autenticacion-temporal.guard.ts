import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { BaseDatosService } from '../database/base-datos.service.js';
import type {
  Rol,
  SolicitudAutenticada,
} from './usuario-autenticado.js';

export const CABECERA_USUARIO = 'x-usuario-id';

/**
 * TEMPORAL, solo para desarrollo, mientras M1 implementa el inicio de sesión
 * (M1-02) con tokens. Identifica al usuario por la cabecera `x-usuario-id` y
 * carga sus roles y permisos desde la base. Cuando exista la autenticación
 * real, se reemplaza este guard: los controladores siguen recibiendo el mismo
 * UsuarioAutenticado. Se niega a funcionar con NODE_ENV=production.
 */
@Injectable()
export class AutenticacionTemporalGuard implements CanActivate {
  constructor(private readonly baseDatos: BaseDatosService) {}

  async canActivate(contexto: ExecutionContext): Promise<boolean> {
    if (process.env.NODE_ENV === 'production') {
      throw new UnauthorizedException(
        'La autenticación temporal está deshabilitada en producción',
      );
    }

    const solicitud = contexto.switchToHttp().getRequest<SolicitudAutenticada>();
    const cabecera = solicitud.header(CABECERA_USUARIO);
    const usuarioId = Number(cabecera);
    if (!cabecera || !Number.isInteger(usuarioId) || usuarioId <= 0) {
      throw new UnauthorizedException(
        `Falta la cabecera ${CABECERA_USUARIO} con el id del usuario`,
      );
    }

    const [usuario] = await this.baseDatos.consultar<{
      id: number;
      estado: string;
      roles: Rol[];
      permisos: string[];
    }>(
      `SELECT u.id, u.estado,
              COALESCE(array_agg(DISTINCT r.codigo) FILTER (WHERE r.id IS NOT NULL), '{}') AS roles,
              COALESCE(array_agg(DISTINCT pe.codigo) FILTER (WHERE pe.id IS NOT NULL), '{}') AS permisos
       FROM usuario u
       LEFT JOIN usuario_rol ur ON ur.usuario_id = u.id
       LEFT JOIN rol r          ON r.id = ur.rol_id
       LEFT JOIN rol_permiso rp ON rp.rol_id = r.id
       LEFT JOIN permiso pe     ON pe.id = rp.permiso_id
       WHERE u.id = $1
       GROUP BY u.id`,
      [usuarioId],
    );

    if (!usuario || usuario.estado !== 'ACTIVA') {
      throw new UnauthorizedException('Usuario inexistente o sin cuenta activa');
    }

    solicitud.usuario = {
      id: usuario.id,
      roles: usuario.roles,
      permisos: usuario.permisos,
    };
    return true;
  }
}
