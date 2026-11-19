import type {
  AcudienteVinculado,
  DetalleAutorizacion,
  PatinadorConAutorizacion,
  RequisitoPerfil,
} from '../types/autorizaciones.types.ts'

/** «12 años · TI 1023456789», para la tarjeta del patinador. */
export function detallePatinador(patinador: PatinadorConAutorizacion): string {
  return `${patinador.edad} años · ${patinador.tipoDocumento} ${patinador.numeroDocumento}`
}

/** «Carolina Torres (madre)», o el aviso cuando no hay vínculo (M1-11). */
export function textoAcudientes(acudientes: AcudienteVinculado[]): string {
  if (acudientes.length === 0) return 'Sin acudiente vinculado'
  return acudientes.map((acudiente) => `${acudiente.nombre} (${acudiente.parentesco})`).join(', ')
}

export function parentescoDe(detalle: DetalleAutorizacion, acudienteId: number): string {
  return detalle.acudientes.find((acudiente) => acudiente.id === acudienteId)?.parentesco ?? '—'
}

/** Texto exacto del Alert de perfil bloqueado (notas de diseño de HU-M1-09). */
export const ETIQUETA_REQUISITO: Record<RequisitoPerfil, string> = {
  AUTORIZACION: 'Falta autorización',
  POLIZA: 'Falta póliza vigente',
}
