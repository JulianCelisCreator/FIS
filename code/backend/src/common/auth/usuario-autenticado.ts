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

/**
 * Usuario de la solicitud (M1-07). `roles` lleva solo el rol con el que
 * ingresó (RF-M1-02) y `permisos`, los de ese rol.
 */
export interface UsuarioAutenticado {
  id: number;
  roles: Rol[];
  permisos: string[];
  /** Sesión de la que viene la solicitud; la usa el cierre de sesión (RF-M1-03). */
  sesionId?: number;
}

export interface SolicitudAutenticada extends Request {
  usuario?: UsuarioAutenticado;
}
