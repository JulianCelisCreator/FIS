import { pedir } from '../../../shared/services/cliente-api.ts'

/** GET /m1/mi-cuenta (HU-M1-04 CA-04). */
export interface DatosMiCuenta {
  nombre: string
  correo: string
  correoVerificado: boolean
}

/** HU-M1-04 CA-04: datos de la cuenta propia, con el estado del correo. */
export function consultarMiCuenta(): Promise<DatosMiCuenta> {
  return pedir<DatosMiCuenta>('/m1/mi-cuenta')
}

/** HU-M1-04: «Reenviar enlace» de verificación a la cuenta con sesión. */
export function reenviarVerificacion(): Promise<{ mensaje: string }> {
  return pedir<{ mensaje: string }>('/m1/mi-cuenta/verificacion', { metodo: 'POST' })
}

/** HU-M1-08 CA-05: cambiar la contraseña propia; la API cierra las demás sesiones. */
export function cambiarContrasena(contrasenaActual: string, contrasenaNueva: string): Promise<{ mensaje: string; sesionesCerradas: number }> {
  return pedir<{ mensaje: string; sesionesCerradas: number }>('/m1/mi-cuenta/contrasena', {
    metodo: 'POST',
    cuerpo: { contrasenaActual, contrasenaNueva },
  })
}
