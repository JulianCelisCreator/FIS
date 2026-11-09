import { pedir } from '../../../shared/services/cliente-api.ts'
import type { Sesion } from '../../../shared/sesion/sesion.types.ts'
import type { CuentaRegistrada, DatosIngreso, DatosRegistro } from '../types/acceso.types.ts'

/** RF-M1-01: crear una cuenta propia. */
export function registrarCuenta(datos: DatosRegistro): Promise<CuentaRegistrada> {
  return pedir<CuentaRegistrada>('/m1/acceso/registro', { metodo: 'POST', cuerpo: datos })
}

/** RF-M1-02: ingresar. La API deja la cookie de sesión y devuelve el usuario con su rol y permisos. */
export function ingresar(datos: DatosIngreso): Promise<Sesion> {
  return pedir<Sesion>('/m1/acceso/ingreso', { metodo: 'POST', cuerpo: datos })
}

/** RF-M1-03: cerrar la sesión actual. */
export function salir(): Promise<unknown> {
  return pedir<unknown>('/m1/acceso/salida', { metodo: 'POST' })
}
