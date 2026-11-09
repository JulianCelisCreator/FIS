// Contratos del inventario de uniformes (RF-M6-06). La API de M6 todavía no
// existe; el servicio de demostración usa estos mismos tipos para que la
// pantalla pueda cambiar a la API sin rehacer los componentes.

export type TipoUniforme = 'CAMISETA' | 'CHAQUETA' | 'PANTALON' | 'UNIFORME_COMPLETO' | 'IMPLEMENTO'

export const TIPOS_UNIFORME: { valor: TipoUniforme; texto: string }[] = [
  { valor: 'CAMISETA', texto: 'Camiseta oficial' },
  { valor: 'CHAQUETA', texto: 'Chaqueta' },
  { valor: 'PANTALON', texto: 'Pantalón' },
  { valor: 'UNIFORME_COMPLETO', texto: 'Uniforme completo' },
  { valor: 'IMPLEMENTO', texto: 'Implemento apto para préstamo' },
]

/** Tallas que usa la escuela; el esquema guarda la talla como texto. */
export const TALLAS = ['4', '6', '8', '10', '12', '14', '16', 'S', 'M', 'L', 'XL'] as const

/** Alerta cuando disponible <= mínimo (v_stock_uniforme). */
export type EstadoStock = 'STOCK_NORMAL' | 'ALERTA_MINIMO'

export const PERMISOS_M6 = {
  inventarioGestionar: 'M6_INVENTARIO_GESTIONAR',
} as const

export interface Proveedor {
  id: number
  razonSocial: string
  nitDocumento: string
  correo: string | null
  telefono: string | null
  activo: boolean
  creadoEn: string
}

export interface Uniforme {
  id: number
  referencia: string
  tipo: TipoUniforme
  talla: string
  proveedorId: number
  costo: number
  precioVenta: number
  cantidadDisponible: number
  cantidadMinima: number
  activo: boolean
  actualizadoEn: string
  fotoUrl: string | null
}

/** Referencia con su proveedor y el estado derivado del stock. */
export interface UniformeInventario extends Uniforme {
  proveedor: Proveedor
  estadoStock: EstadoStock
}

export interface DatosUniforme {
  referencia: string
  tipo: TipoUniforme
  talla: string
  proveedorId: number
  costo: number
  precioVenta: number
  cantidadDisponible: number
  cantidadMinima: number
  fotoUrl?: string | null
}

export interface DatosProveedor {
  razonSocial: string
  nitDocumento: string
  correo?: string
  telefono?: string
}

export function textoTipoUniforme(tipo: TipoUniforme): string {
  return TIPOS_UNIFORME.find((opcion) => opcion.valor === tipo)?.texto ?? tipo
}

/** «correo · teléfono» o un aviso cuando el proveedor no tiene contacto. */
export function contactoProveedor(
  proveedor: Pick<Proveedor, 'correo' | 'telefono'>,
): string {
  return [proveedor.correo, proveedor.telefono].filter(Boolean).join(' · ') || 'Sin datos de contacto'
}

/** Estado del catálogo de insignias para una referencia. */
export function estadoInsigniaUniforme(
  uniforme: Pick<UniformeInventario, 'activo' | 'estadoStock'>,
): string {
  if (!uniforme.activo) return 'inactiva'
  return uniforme.estadoStock === 'ALERTA_MINIMO' ? 'alerta-minimo' : 'stock-normal'
}
