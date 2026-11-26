import { pedir } from '../../../shared/services/cliente-api.ts'

/** HU-M1-08 CA-05: cambiar la contraseña propia; la API cierra las demás sesiones. */
export function cambiarContrasena(contrasenaActual: string, contrasenaNueva: string): Promise<{ mensaje: string; sesionesCerradas: number }> {
  return pedir<{ mensaje: string; sesionesCerradas: number }>('/m1/mi-cuenta/contrasena', {
    metodo: 'POST',
    cuerpo: { contrasenaActual, contrasenaNueva },
  })
}
