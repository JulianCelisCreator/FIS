// Contratos de la venta de uniformes (HU-6.7 / RF-M6-07). Son los mismos que
// devuelve la API NestJS en /m6/ventas, para que la pantalla pueda pasar de la
// demostración local a la API sin rehacer los componentes.

import type { MedioPago } from '../../m5-planes-tarifas-pagos/types/m5.types.ts'

export type TipoComprador = 'PATINADOR' | 'ACUDIENTE'

/** GET /m6/ventas/compradores: patinadores activos con sus acudientes vinculados. */
export interface CompradorVenta {
  patinadorId: number
  patinador: string
  documento: string
  acudientes: { id: number; nombre: string; parentesco: string }[]
}

export interface LineaVenta {
  uniformeId: number
  referencia: string
  talla: string
  cantidad: number
  valorUnitario: number
  subtotal: number
}

/** GET /m6/ventas y respuesta de POST /m6/ventas. */
export interface VentaRegistrada {
  id: number
  fecha: string
  patinadorId: number
  patinador: string
  compradorTipo: TipoComprador
  comprador: string
  medioPago: MedioPago
  referenciaPago: string | null
  total: number
  comprobante: string
  estadoPago: 'REGISTRADO' | 'ANULADO'
  registradoPor: string
  registradoEn: string
  items: LineaVenta[]
}

/** Cuerpo de POST /m6/ventas. El valor unitario lo fija el servidor. */
export interface DatosVenta {
  patinadorId: number
  compradorTipo: TipoComprador
  acudienteId?: number
  medioPago: MedioPago
  referenciaPago?: string
  items: { uniformeId: number; cantidad: number }[]
}

/** Tipos de inventario que se venden; los implementos solo se prestan (HU-6.8). */
export const TIPOS_VENDIBLES = ['CAMISETA', 'CHAQUETA', 'PANTALON', 'UNIFORME_COMPLETO'] as const
