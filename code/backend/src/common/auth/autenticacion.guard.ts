import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { BaseDatosService } from '../database/base-datos.service.js';
import { COOKIE_SESION, hashTokenSesion, leerCookie } from './token-sesion.js';
import type { Rol, SolicitudAutenticada } from './usuario-autenticado.js';

export const MENSAJE_SIN_SESION = 'Tu sesión no es válida o ya terminó. Ingresa de nuevo.';

/**
 * Autenticación por sesión (HU-M1-02). Lee la cookie httpOnly, busca la sesión
 * abierta y vigente por el hash del token y comprueba que la cuenta siga
 * activa. Carga los roles de la cuenta y sus permisos, así que los
 * controladores siguen recibiendo el mismo UsuarioAutenticado de siempre.
 */
@Injectable()
export class AutenticacionGuard implements CanActivate {
  constructor(private readonly baseDatos: BaseDatosService) {}

  async canActivate(contexto: ExecutionContext): Promise<boolean> {
    const solicitud = contexto.switchToHttp().getRequest<SolicitudAutenticada>();
    const token = leerCookie(solicitud.headers.cookie, COOKIE_SESION);
    if (!token) throw new UnauthorizedException(MENSAJE_SIN_SESION);

    const [usuario] = await this.baseDatos.consultar<{ id: number; roles: Rol[]; permisos: string[] }>(
      `SELECT u.id,
              COALESCE(array_agg(DISTINCT r.codigo) FILTER (WHERE r.id IS NOT NULL), '{}') AS roles,
              COALESCE(array_agg(DISTINCT pe.codigo) FILTER (WHERE pe.id IS NOT NULL), '{}') AS permisos
       FROM sesion s
       JOIN usuario u           ON u.id = s.usuario_id
       LEFT JOIN usuario_rol ur ON ur.usuario_id = u.id
       LEFT JOIN rol r          ON r.id = ur.rol_id
       LEFT JOIN rol_permiso rp ON rp.rol_id = r.id
       LEFT JOIN permiso pe     ON pe.id = rp.permiso_id
       WHERE s.refresh_token_hash = $1
         AND s.cerrada_en IS NULL
         AND s.expira_en > now()
         AND u.estado = 'ACTIVA'
       GROUP BY u.id`,
      [hashTokenSesion(token)],
    );

    // Sin fila: token desconocido, sesión cerrada o vencida, o cuenta que ya no está activa.
    if (!usuario) throw new UnauthorizedException(MENSAJE_SIN_SESION);

    solicitud.usuario = usuario;
    return true;
  }
}
