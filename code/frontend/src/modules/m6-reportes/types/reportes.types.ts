// Contrato de GET /m6/reportes/:tipo (HU-6.4 / RF-M6-04). La pantalla pinta
// columnas, filas y totales tal como los declara el servidor, así que lo que se
// ve es lo mismo que se exporta (HU-6.5).

export type TipoReporte = 'ingresos' | 'pagos' | 'cartera' | 'movimientos-uniformes'
export type FormatoValor = 'texto' | 'fecha' | 'cop' | 'numero'
export type FormatoExportacion = 'pdf' | 'xlsx'

export const TIPOS_REPORTE: { valor: TipoReporte; texto: string; ayuda: string }[] = [
  { valor: 'ingresos', texto: 'Ingresos', ayuda: 'Pagos registrados por concepto, menos reembolsos de devoluciones.' },
  { valor: 'pagos', texto: 'Pagos recibidos', ayuda: 'Cada pago registrado con su comprobante y medio de pago.' },
  { valor: 'cartera', texto: 'Cartera pendiente', ayuda: 'Saldo pendiente por patinador a la fecha final.' },
  { valor: 'movimientos-uniformes', texto: 'Movimientos de uniformes', ayuda: 'Kardex de entradas, ventas, préstamos y devoluciones.' },
]

export const PERMISOS_REPORTES = {
  reporteFinanciero: 'M6_REPORTE_FINANCIERO',
} as const

export interface ColumnaReporte {
  clave: string
  etiqueta: string
  formato: FormatoValor
}

export interface TotalReporte {
  clave: string
  etiqueta: string
  valor: number
  formato: 'cop' | 'numero'
}

export interface Reporte {
  tipo: TipoReporte
  titulo: string
  desde: string
  hasta: string
  generadoEn: string
  totales: TotalReporte[]
  columnas: ColumnaReporte[]
  filas: Record<string, string | number | null>[]
  sinDatos: boolean
  notas: string[]
}

export interface ErroresRango {
  desde?: string
  hasta?: string
}

/** Mismas reglas que el servidor: fechas obligatorias e inicial ≤ final. */
export function validarRango(desde: string, hasta: string): ErroresRango {
  const errores: ErroresRango = {}
  if (!desde) errores.desde = 'Indica la fecha inicial.'
  if (!hasta) errores.hasta = 'Indica la fecha final.'
  if (desde && hasta && desde > hasta) errores.hasta = 'La fecha final debe ser igual o posterior a la inicial.'
  return errores
}
