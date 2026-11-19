import { pedir } from '../../../shared/services/cliente-api.ts'
import type {
  DatosRegistrarAutorizacion,
  DetalleAutorizacion,
  PatinadorConAutorizacion,
} from '../types/autorizaciones.types.ts'

/** HU-M1-09: patinadores del acudiente (o todos, si es Administrador). */
export function listarPatinadoresAutorizacion(): Promise<PatinadorConAutorizacion[]> {
  return pedir<PatinadorConAutorizacion[]>('/m1/autorizaciones')
}

/** HU-M1-09: autorización, acudiente que la otorgó y estado del perfil. */
export function detalleAutorizacion(patinadorId: number): Promise<DetalleAutorizacion> {
  return pedir<DetalleAutorizacion>(`/m1/autorizaciones/${patinadorId}`)
}

/** HU-M1-09: registra la autorización una sola vez. */
export function registrarAutorizacion(
  patinadorId: number,
  datos: DatosRegistrarAutorizacion,
): Promise<DetalleAutorizacion> {
  return pedir<DetalleAutorizacion>(`/m1/autorizaciones/${patinadorId}`, {
    metodo: 'POST',
    cuerpo: datos,
  })
}
