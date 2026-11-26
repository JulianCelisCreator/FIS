// Reglas de la asignación del rol Contador (HU-6.3 / RF-M6-03), sin acceso a
// base de datos para poder probarlas de forma aislada.
import { ErrorReglaPersonal } from './reglas-personal.js';

export const ROL_CONTADOR = 'CONTADOR';

export interface PersonaParaRol {
  estado: 'ACTIVO' | 'INACTIVO';
  usuarioId: number | null;
}

export interface CuentaParaRol {
  estado: string;
  roles: string[];
}

/**
 * El rol Contador solo se asigna a una persona activa del registro de personal
 * con una cuenta de M1 vinculada que no esté desactivada. Una cuenta «Por
 * registrar» se acepta (cambio #3: el Contador entra con contraseña temporal);
 * el rol funciona cuando la cuenta se active.
 */
export function validarAsignacionContador(
  persona: PersonaParaRol | null,
  cuenta: CuentaParaRol | null,
): number {
  if (!persona) {
    throw new ErrorReglaPersonal('La persona no existe en el registro de personal', 'NO_ENCONTRADO');
  }
  if (persona.estado !== 'ACTIVO') {
    throw new ErrorReglaPersonal('Solo se puede asignar el rol Contador a personal activo');
  }
  if (persona.usuarioId === null || !cuenta) {
    throw new ErrorReglaPersonal(
      'La persona no tiene una cuenta de usuario vinculada; vincúlala antes de asignar el rol',
    );
  }
  if (cuenta.estado === 'DESACTIVADA') {
    throw new ErrorReglaPersonal('La cuenta de usuario está desactivada');
  }
  if (cuenta.roles.includes(ROL_CONTADOR)) {
    throw new ErrorReglaPersonal('La persona ya tiene el rol Contador', 'DUPLICADO');
  }
  return persona.usuarioId;
}

/** Valida que la persona tenga el rol y devuelve el id de su cuenta. */
export function validarRetiroContador(
  persona: PersonaParaRol | null,
  cuenta: CuentaParaRol | null,
): number {
  if (!persona) {
    throw new ErrorReglaPersonal('La persona no existe en el registro de personal', 'NO_ENCONTRADO');
  }
  if (persona.usuarioId === null || !cuenta || !cuenta.roles.includes(ROL_CONTADOR)) {
    throw new ErrorReglaPersonal('La persona no tiene el rol Contador');
  }
  return persona.usuarioId;
}
