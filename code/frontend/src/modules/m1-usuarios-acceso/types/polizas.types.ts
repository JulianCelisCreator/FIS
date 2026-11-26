import type { PatinadorConAutorizacion } from './autorizaciones.types.ts'

/** Tipos de HU-M1-10 · Póliza médica del patinador. */

export type EstadoPoliza = 'VIGENTE' | 'VENCIDA' | 'PENDIENTE'
export type EstadoRevisionPoliza = 'PENDIENTE' | 'APROBADA' | 'RECHAZADA'

export interface ArchivoPoliza {
  nombre: string
  tipo: string
  /** Tamaño en bytes. */
  tamano: number
}

export interface PolizaRegistrada {
  id: number
  aseguradora: string
  numeroPoliza: string
  /** 'AAAA-MM-DD'. */
  vigenteDesde: string
  /** 'AAAA-MM-DD'. */
  vigenteHasta: string
  /** Vigencia calculada al consultar (CA-03). */
  estado: EstadoPoliza
  estadoRevision: EstadoRevisionPoliza
  archivo: ArchivoPoliza | null
  /** ISO de la marca de tiempo del registro. */
  registradaEn: string
  registradaPor: { id: number; nombre: string } | null
}

/** Detalle que alimenta la Card «Póliza médica» y su diálogo. */
export interface DetallePoliza extends PatinadorConAutorizacion {
  polizaActual: PolizaRegistrada | null
  historial: PolizaRegistrada[]
  puedeRegistrar: boolean
  motivoNoRegistra: string | null
}

/** Datos del formulario multipart de registro. */
export interface DatosRegistrarPoliza {
  aseguradora: string
  numeroPoliza: string
  vigenteDesde: string
  vigenteHasta: string
  archivo: File
}
