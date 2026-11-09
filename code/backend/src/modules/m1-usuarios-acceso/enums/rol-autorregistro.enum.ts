import { Rol } from '../../../common/auth/usuario-autenticado.js';

/**
 * Roles con los que una persona puede crear su propia cuenta en la pantalla de
 * acceso (RF-M1-01, spec M1 §2 punto 1). Administrador, Contador y
 * Fisioterapeuta solo los crea el Administrador (RF-M1-05).
 */
export const ROLES_AUTORREGISTRO = [
  Rol.PATINADOR,
  Rol.ACUDIENTE,
  Rol.PROFESOR,
  Rol.VISITANTE,
] as const;

export type RolAutorregistro = (typeof ROLES_AUTORREGISTRO)[number];
