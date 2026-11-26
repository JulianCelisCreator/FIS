/**
 * Validación de HU-M1-10 en el navegador. Repite las reglas del backend para
 * explicar el error antes de subir el archivo (CA-02 y CA-05).
 */

export const TAMANO_MAXIMO_POLIZA = 5 * 1024 * 1024
export const TIPOS_ARCHIVO_POLIZA = ['application/pdf', 'image/jpeg', 'image/png'] as const
export const ACEPTAR_ARCHIVO_POLIZA =
  '.pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png'

export const MENSAJE_ARCHIVO_REQUERIDO = 'Adjunta el documento de la póliza.'
export const MENSAJE_TIPO_ARCHIVO = 'El archivo debe ser PDF, JPG o PNG.'
export const MENSAJE_TAMANO_ARCHIVO = 'El archivo supera el tamaño máximo de 5 MB.'
export const MENSAJE_ARCHIVO_VACIO = 'El archivo está vacío.'

export interface ErroresPoliza {
  aseguradora?: string
  numeroPoliza?: string
  vigenteDesde?: string
  vigenteHasta?: string
  archivo?: string
}

export interface DatosPolizaFormulario {
  aseguradora: string
  numeroPoliza: string
  vigenteDesde: string
  vigenteHasta: string
}

export function validarDatosPoliza(datos: DatosPolizaFormulario): ErroresPoliza {
  const errores: ErroresPoliza = {}
  if (datos.aseguradora.trim().length < 2) {
    errores.aseguradora = 'Escribe la aseguradora de la póliza.'
  }
  if (datos.numeroPoliza.trim().length === 0) {
    errores.numeroPoliza = 'Escribe el número de la póliza.'
  }
  if (!esFechaValida(datos.vigenteDesde)) {
    errores.vigenteDesde = 'Elige la fecha de inicio de la vigencia.'
  }
  if (!esFechaValida(datos.vigenteHasta)) {
    errores.vigenteHasta = 'Elige la fecha de fin de la vigencia.'
  }
  if (
    !errores.vigenteDesde &&
    !errores.vigenteHasta &&
    datos.vigenteHasta < datos.vigenteDesde
  ) {
    errores.vigenteHasta = 'La fecha de fin no puede ser anterior a la de inicio.'
  }
  return errores
}

export function validarArchivoPoliza(archivo: File | null): string | null {
  if (!archivo) return MENSAJE_ARCHIVO_REQUERIDO
  if (archivo.size === 0) return MENSAJE_ARCHIVO_VACIO
  if (!TIPOS_ARCHIVO_POLIZA.includes(archivo.type as (typeof TIPOS_ARCHIVO_POLIZA)[number])) {
    return MENSAJE_TIPO_ARCHIVO
  }
  if (archivo.size > TAMANO_MAXIMO_POLIZA) return MENSAJE_TAMANO_ARCHIVO
  return null
}

export function formatoTamanoArchivo(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`
  return `${bytes} B`
}

function esFechaValida(iso: string): boolean {
  const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (!partes) return false
  const anio = Number(partes[1])
  const mes = Number(partes[2])
  const dia = Number(partes[3])
  const fecha = new Date(Date.UTC(anio, mes - 1, dia))
  return (
    fecha.getUTCFullYear() === anio &&
    fecha.getUTCMonth() === mes - 1 &&
    fecha.getUTCDate() === dia
  )
}
