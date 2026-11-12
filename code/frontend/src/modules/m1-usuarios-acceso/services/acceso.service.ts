import { pedir } from '../../../shared/services/cliente-api.ts'
import type { Sesion } from '../../../shared/sesion/sesion.types.ts'

/** Cuerpo de POST /m1/acceso/ingreso. */
export interface DatosIngreso {
  correo: string
  contrasena: string
}

/** HU-M1-02: ingresar. La API deja la cookie de sesión y devuelve el usuario con sus roles y permisos. */
export function ingresar(datos: DatosIngreso): Promise<Sesion> {
  return pedir<Sesion>('/m1/acceso/ingreso', { metodo: 'POST', cuerpo: datos })
}
