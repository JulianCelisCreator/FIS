import { ForbiddenException } from '@nestjs/common';
import { Rol, type UsuarioAutenticado } from '../../../common/auth/usuario-autenticado.js';

export const MENSAJE_SOLO_ADMINISTRADOR_GESTION = 'Solo el Administrador puede gestionar las cuentas.';

/**
 * La gestión de cuentas es solo del Administrador (HU-M1-05 CA-06, HU-M1-06
 * CA-05). La matriz de permisos completa llega con HU-M1-07; mientras tanto
 * se exige el rol en el servidor.
 */
export function exigirAdministrador(usuario: UsuarioAutenticado, mensaje = MENSAJE_SOLO_ADMINISTRADOR_GESTION): void {
  if (!usuario.roles.includes(Rol.ADMINISTRADOR)) throw new ForbiddenException(mensaje);
}
