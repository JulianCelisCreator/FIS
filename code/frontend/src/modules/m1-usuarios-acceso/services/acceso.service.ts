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

/** HU-M1-08 CA-01: pedir el enlace. La respuesta es la misma exista o no la cuenta. */
export function solicitarRecuperacion(correo: string): Promise<{ mensaje: string }> {
  return pedir<{ mensaje: string }>('/m1/acceso/recuperacion', { metodo: 'POST', cuerpo: { correo } })
}

/** HU-M1-08 CA-02: ¿el enlace sigue sirviendo? */
export function validarEnlaceRecuperacion(token: string): Promise<{ valido: boolean }> {
  return pedir<{ valido: boolean }>('/m1/acceso/recuperacion/validar', { metodo: 'POST', cuerpo: { token } })
}

/** HU-M1-08 CA-03: definir la nueva contraseña con el enlace. */
export function restablecerContrasena(token: string, contrasena: string): Promise<{ mensaje: string }> {
  return pedir<{ mensaje: string }>('/m1/acceso/recuperacion/restablecer', { metodo: 'POST', cuerpo: { token, contrasena } })
}
