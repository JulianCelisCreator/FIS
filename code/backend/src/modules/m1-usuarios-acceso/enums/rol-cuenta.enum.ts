import { Rol } from '../../../common/auth/usuario-autenticado.js';

/**
 * Roles que el Administrador asigna al crear una cuenta (HU-M1-01, HU-M1-05
 * CA-02: profesores, patinadores, acudientes, contadores y fisioterapeutas).
 */
export const ROLES_CUENTA = [
  Rol.PROFESOR,
  Rol.PATINADOR,
  Rol.ACUDIENTE,
  Rol.CONTADOR,
  Rol.FISIOTERAPEUTA,
] as const;

export type RolCuenta = (typeof ROLES_CUENTA)[number];
