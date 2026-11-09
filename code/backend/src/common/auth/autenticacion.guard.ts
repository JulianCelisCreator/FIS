import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { BaseDatosService } from '../database/base-datos.service.js';
import { COOKIE_SESION, hashTokenSesion, leerCookie, rolDelToken } from './token-sesion.js';
import type { SolicitudAutenticada } from './usuario-autenticado.js';

export const MENSAJE_SIN_SESION = 'Tu sesión no es válida o ya terminó. Ingresa de nuevo.';

/**
 * Autenticación por sesión (RF-M1-02). Lee la cookie httpOnly, busca la sesión
 * abierta y vigente por el hash del token y comprueba que la cuenta siga activa
 * y conserve el rol con el que ingresó. El usuario de la solicitud lleva solo
 * ese rol y sus permisos (RF-M1-07), así que los controladores siguen
 * recibiendo el mismo UsuarioAutenticado de siempre.
 */
@Injectable()
export class AutenticacionGuard implements CanActivate {
  constructor(private readonly baseDatos: BaseDatosService) {}

  async canActivate(contexto: ExecutionContext): Promise<boolean> {
    const solicitud = contexto.switchToHttp().getRequest<SolicitudAutenticada>();
    const token = leerCookie(solicitud.headers.cookie, COOKIE_SESION);
    const rol = token ? rolDelToken(token) : null;
    if (!token || !rol) throw new UnauthorizedException(MENSAJE_SIN_SESION);

    const [fila] = await this.baseDatos.consultar<{
      sesionId: number;
      usuarioId: number;
      tieneRol: boolean;
      permisos: string[];
    }>(
      `SELECT s.id AS "sesionId", u.id AS "usuarioId",
              EXISTS (SELECT 1 FROM usuario_rol ur JOIN rol r ON r.id = ur.rol_id
                      WHERE ur.usuario_id = u.id AND r.codigo = $2) AS "tieneRol",
              COALESCE((SELECT array_agg(DISTINCT pe.codigo)
                        FROM rol r
                        JOIN rol_permiso rp ON rp.rol_id = r.id
                        JOIN permiso pe ON pe.id = rp.permiso_id
                        WHERE r.codigo = $2), '{}') AS permisos
       FROM sesion s
       JOIN usuario u ON u.id = s.usuario_id
       WHERE s.refresh_token_hash = $1
         AND s.cerrada_en IS NULL
         AND s.expira_en > now()
         AND u.estado = 'ACTIVA'`,
      [hashTokenSesion(token), rol],
    );

    // Sin fila: token desconocido, sesión cerrada o vencida, o cuenta no activa.
    // Sin el rol: se lo quitaron después de ingresar.
    if (!fila || !fila.tieneRol) throw new UnauthorizedException(MENSAJE_SIN_SESION);

    solicitud.usuario = {
      id: fila.usuarioId,
      roles: [rol],
      permisos: fila.permisos,
      sesionId: fila.sesionId,
    };
    return true;
  }
}
