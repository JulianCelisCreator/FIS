import { enviarFormulario, pedir, urlApi } from '../../../shared/services/cliente-api.ts'
import type {
  DatosRegistrarPoliza,
  DetallePoliza,
} from '../types/polizas.types.ts'

/** HU-M1-10: póliza actual, historial y estado del perfil del patinador. */
export function detallePoliza(patinadorId: number): Promise<DetallePoliza> {
  return pedir<DetallePoliza>(`/m1/polizas/${patinadorId}`)
}

/** HU-M1-10: registra una póliza nueva sin borrar las anteriores. */
export function registrarPoliza(
  patinadorId: number,
  datos: DatosRegistrarPoliza,
): Promise<DetallePoliza> {
  const formulario = new FormData()
  formulario.set('aseguradora', datos.aseguradora)
  formulario.set('numeroPoliza', datos.numeroPoliza)
  formulario.set('vigenteDesde', datos.vigenteDesde)
  formulario.set('vigenteHasta', datos.vigenteHasta)
  formulario.set('archivo', datos.archivo)
  return enviarFormulario<DetallePoliza>(`/m1/polizas/${patinadorId}`, formulario)
}

/** Enlace autenticado al adjunto privado; no es una ruta estática. */
export function urlArchivoPoliza(patinadorId: number, polizaId: number): string {
  return urlApi(`/m1/polizas/${patinadorId}/archivo/${polizaId}`)
}
