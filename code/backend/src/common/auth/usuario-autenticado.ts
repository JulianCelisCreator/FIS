import type { Request } from 'express';

/** Roles del sistema (tabla rol, M1-06). */
export enum Rol {
  ADMINISTRADOR = 'ADMINISTRADOR',
  PROFESOR = 'PROFESOR',
  PATINADOR = 'PATINADOR',
  ACUDIENTE = 'ACUDIENTE',
  CONTADOR = 'CONTADOR',
  FISIOTERAPEUTA = 'FISIOTERAPEUTA',
  VISITANTE = 'VISITANTE',
}

/** Usuario de la solicitud, con sus roles y los permisos de esos roles (M1-07). */
export interface UsuarioAutenticado {
  id: number;
  roles: Rol[];
  permisos: string[];
}

export interface SolicitudAutenticada extends Request {
  usuario?: UsuarioAutenticado;
}
