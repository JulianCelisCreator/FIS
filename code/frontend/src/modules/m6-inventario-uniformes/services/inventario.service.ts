import { pedir } from '../../../shared/services/cliente-api.ts'
import type {
  DatosProveedor,
  DatosUniforme,
  Proveedor,
  UniformeInventario,
} from '../types/inventario.types.ts'
import { hoyEnClub } from '../../../shared/utils/formato.ts'
import { MEDIOS_PAGO } from '../../m5-planes-tarifas-pagos/types/m5.types.ts'
import type {
  CompradorVenta,
  DatosDevolucion,
  DatosVenta,
  VentaRegistrada,
} from '../types/venta.types.ts'

export interface MovimientoInventario {
  id: number
  uniformeId: number
  referencia: string
  tipo: 'ENTRADA' | 'VENTA' | 'PRESTAMO' | 'DEVOLUCION' | 'BAJA' | 'AJUSTE'
  cantidad: number
  observacion: string | null
  registradoPor: string
  registradoEn: string
}

interface UniformeApi extends Omit<UniformeInventario, 'proveedor' | 'proveedorId'> {
  proveedorId: number | null
  proveedor: string | null
}

function adaptarUniforme(uniforme: UniformeApi, proveedores: Proveedor[]): UniformeInventario {
  const proveedor = proveedores.find((item) => item.id === uniforme.proveedorId) ?? {
    id: 0,
    razonSocial: uniforme.proveedor ?? 'Sin proveedor',
    nitDocumento: '',
    correo: null,
    telefono: null,
    activo: true,
    creadoEn: '',
  }
  return { ...uniforme, proveedorId: uniforme.proveedorId ?? 0, proveedor }
}

async function uniformeDeApi(peticion: Promise<UniformeApi>): Promise<UniformeInventario> {
  const [uniforme, proveedores] = await Promise.all([peticion, pedir<Proveedor[]>('/m6/proveedores')])
  return adaptarUniforme(uniforme, proveedores)
}

function cuerpoUniforme(datos: DatosUniforme) {
  return {
    ...datos,
    referencia: datos.referencia.trim(),
    talla: datos.talla.trim(),
    proveedorId: datos.proveedorId || undefined,
    fotoUrl: datos.fotoUrl?.trim() || null,
  }
}

export function listarMovimientos(uniformeId?: number): Promise<MovimientoInventario[]> {
  return pedir<MovimientoInventario[]>(
    uniformeId === undefined ? '/m6/uniformes/movimientos' : `/m6/uniformes/${uniformeId}/movimientos`,
  )
}

function validarUniforme(datos: DatosUniforme) {
  if (!datos.referencia.trim()) throw new Error('La referencia es obligatoria.')
  if (!datos.tipo) throw new Error('El tipo de uniforme es obligatorio.')
  if (!datos.talla.trim()) throw new Error('La talla es obligatoria.')
  if (!datos.proveedorId) throw new Error('Elige un proveedor registrado.')

  if (!Number.isFinite(datos.costo) || datos.costo < 0) {
    throw new Error('El costo debe ser un valor de cero o más.')
  }
  if (!Number.isFinite(datos.precioVenta) || datos.precioVenta < 0) {
    throw new Error('El precio de venta debe ser un valor de cero o más.')
  }
  if (!Number.isInteger(datos.cantidadDisponible) || datos.cantidadDisponible < 0) {
    throw new Error('La cantidad disponible debe ser un entero de cero o más.')
  }
  if (!Number.isInteger(datos.cantidadMinima) || datos.cantidadMinima < 0) {
    throw new Error('La cantidad mínima debe ser un entero de cero o más.')
  }
}

export async function listarInventario(): Promise<UniformeInventario[]> {
  const [uniformes, proveedores] = await Promise.all([
    pedir<UniformeApi[]>('/m6/uniformes'),
    pedir<Proveedor[]>('/m6/proveedores'),
  ])
  return uniformes.map((uniforme) => adaptarUniforme(uniforme, proveedores))
}

export function listarProveedores(): Promise<Proveedor[]> {
  return pedir<Proveedor[]>('/m6/proveedores')
}

export async function crearUniforme(datos: DatosUniforme): Promise<UniformeInventario> {
  validarUniforme(datos)
  return uniformeDeApi(pedir<UniformeApi>('/m6/uniformes', { metodo: 'POST', cuerpo: cuerpoUniforme(datos) }))
}

export async function editarUniforme(id: number, datos: DatosUniforme): Promise<UniformeInventario> {
  validarUniforme(datos)
  return uniformeDeApi(pedir<UniformeApi>(`/m6/uniformes/${id}`, { metodo: 'PATCH', cuerpo: cuerpoUniforme(datos) }))
}

export async function cambiarEstadoUniforme(
  id: number,
  activo: boolean,
  motivo = '',
): Promise<UniformeInventario> {
  if (!activo && !motivo.trim()) throw new Error('Escribe el motivo de la desactivación.')
  return uniformeDeApi(pedir<UniformeApi>(
    `/m6/uniformes/${id}/${activo ? 'reactivar' : 'desactivar'}`,
    { metodo: 'POST', cuerpo: activo ? {} : { motivo: motivo.trim() } },
  ))
}

export function crearProveedor(datos: DatosProveedor): Promise<Proveedor> {
  if (!datos.razonSocial.trim()) return Promise.reject(new Error('El nombre del proveedor es obligatorio.'))
  if (!datos.nitDocumento.trim()) return Promise.reject(new Error('El NIT o documento es obligatorio.'))
  return pedir<Proveedor>('/m6/proveedores', {
    metodo: 'POST',
    cuerpo: {
      razonSocial: datos.razonSocial.trim(),
      nitDocumento: datos.nitDocumento.trim(),
      correo: datos.correo?.trim() || undefined,
      telefono: datos.telefono?.trim() || undefined,
    },
  })
}

export function cambiarEstadoProveedor(id: number, activo: boolean): Promise<Proveedor> {
  return pedir<Proveedor>(`/m6/proveedores/${id}/estado`, { metodo: 'PATCH', cuerpo: { activo } })
}

export async function ajustarStock(
  id: number,
  cantidad: number,
  observacion: string,
): Promise<UniformeInventario> {
  if (!Number.isInteger(cantidad) || cantidad === 0) {
    throw new Error('El ajuste debe ser un número entero distinto de cero.')
  }
  return uniformeDeApi(pedir<UniformeApi>(`/m6/uniformes/${id}/stock`, {
    metodo: 'PATCH',
    cuerpo: { cantidad, observacion: observacion.trim() || undefined },
  }))
}

export interface PrestamoUniformeApi {
  id: number
  uniformeId: number
  uniforme: string
  patinadorId: number
  patinador: string
  responsableId: number
  responsable: string
  cantidad: number
  valorPorUnidad: number
  valorCobro: number
  duracionDias: number
  cobroId: number | null
  saldoPendiente: number
  fechaPrestamo: string
  fechaDevolucionPrevista: string
  estadoEntrega: 'NUEVO' | 'BUEN_ESTADO' | 'CON_DESGASTE'
  estado: 'ACTIVO' | 'DEVUELTO' | 'PERDIDA_DANO'
  estadoActual: 'ACTIVO' | 'VENCIDO' | 'DEVUELTO' | 'PERDIDA_DANO'
  fechaRecepcion: string | null
  estadoRecepcion: 'BUEN_ESTADO' | 'CON_DESGASTE' | 'DANADO' | null
  observacion: string | null
}

export interface DatosPrestamo {
  uniformeId: number
  patinadorId: number
  responsableId: number
  cantidad: number
  valorPorUnidad: number
  fechaDevolucionPrevista: string
  estadoEntrega: 'NUEVO' | 'BUEN_ESTADO' | 'CON_DESGASTE'
}

export interface DatosRecepcion {
  estado: 'DEVUELTO' | 'PERDIDA_DANO'
  estadoRecepcion?: 'BUEN_ESTADO' | 'CON_DESGASTE' | 'DANADO'
  observacion?: string
}

export interface ResponsablePrestamo {
  id: number
  nombre: string
}

export interface PatinadorPrestamo {
  id: number
  nombre: string
  responsables: ResponsablePrestamo[]
}

export function diasPrestamo(fechaDevolucionPrevista: string, fechaPrestamo = hoyEnClub()): number {
  const inicio = new Date(`${fechaPrestamo}T00:00:00Z`)
  const fin = new Date(`${fechaDevolucionPrevista}T00:00:00Z`)
  return Math.max(1, Math.round((fin.getTime() - inicio.getTime()) / 86400000))
}

export function listarPrestamos(): Promise<PrestamoUniformeApi[]> {
  return pedir<PrestamoUniformeApi[]>('/m6/prestamos')
}

export function listarPatinadoresPrestamo(): Promise<PatinadorPrestamo[]> {
  return pedir<PatinadorPrestamo[]>('/m6/prestamos/patinadores')
}

function validarDatosPrestamo(datos: DatosPrestamo): void {
  if (!Number.isInteger(datos.uniformeId) || datos.uniformeId < 1) throw new Error('Selecciona un implemento disponible.')
  if (!Number.isInteger(datos.patinadorId) || datos.patinadorId < 1) throw new Error('Selecciona un patinador.')
  if (!Number.isInteger(datos.responsableId) || datos.responsableId < 1) throw new Error('Selecciona un responsable.')
  if (!Number.isSafeInteger(datos.cantidad) || datos.cantidad < 1) {
    throw new Error('La cantidad debe ser un entero mayor que cero.')
  }
  if (!Number.isFinite(datos.valorPorUnidad) || datos.valorPorUnidad < 0) {
    throw new Error('La tarifa por día debe ser un valor de cero o más.')
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(datos.fechaDevolucionPrevista)) throw new Error('Indica una fecha de devolución válida.')
  if (datos.fechaDevolucionPrevista < hoyEnClub()) throw new Error('La fecha prevista debe ser hoy o posterior.')
}

export async function crearPrestamo(datos: DatosPrestamo): Promise<PrestamoUniformeApi> {
  validarDatosPrestamo(datos)
  return pedir<PrestamoUniformeApi>('/m6/prestamos', { metodo: 'POST', cuerpo: datos })
}

export async function recibirPrestamo(id: number, datos: DatosRecepcion): Promise<PrestamoUniformeApi> {
  if (datos.estado === 'PERDIDA_DANO' && !datos.observacion?.trim()) {
    throw new Error('Debes explicar la pérdida o el daño.')
  }
  return pedir<PrestamoUniformeApi>(`/m6/prestamos/${id}/recibir`, {
    metodo: 'PATCH',
    cuerpo: { ...datos, observacion: datos.observacion?.trim() || undefined },
  })
}

export function listarVentas(): Promise<VentaRegistrada[]> {
  return pedir<VentaRegistrada[]>('/m6/ventas')
}

export function listarCompradoresVenta(): Promise<CompradorVenta[]> {
  return pedir<CompradorVenta[]>('/m6/ventas/compradores')
}

export function consolidarItemsVenta(items: DatosVenta['items']): DatosVenta['items'] {
  const porUniforme = new Map<number, number>()
  for (const item of items) porUniforme.set(item.uniformeId, (porUniforme.get(item.uniformeId) ?? 0) + item.cantidad)
  return [...porUniforme.entries()].map(([uniformeId, cantidad]) => ({ uniformeId, cantidad }))
}

export function registrarVenta(datos: DatosVenta): Promise<VentaRegistrada> {
  return pedir<VentaRegistrada>('/m6/ventas', {
    metodo: 'POST',
    cuerpo: {
      ...datos,
      acudienteId: datos.compradorTipo === 'ACUDIENTE' ? datos.acudienteId : undefined,
      referenciaPago: datos.referenciaPago?.trim() || undefined,
      items: consolidarItemsVenta(datos.items),
    },
  })
}

export async function registrarDevolucion(ventaId: number, datos: DatosDevolucion): Promise<VentaRegistrada> {
  if (datos.motivo.trim().length < 3) throw new Error('Escribe el motivo de la devolución.')
  if (!MEDIOS_PAGO.some((medio) => medio.valor === datos.medioReembolso)) throw new Error('Elige el medio del reembolso.')
  const items = consolidarItemsVenta(datos.items.filter((item) => item.cantidad > 0))
  if (items.length === 0) throw new Error('Indica al menos una unidad a devolver.')
  return pedir<VentaRegistrada>(`/m6/ventas/${ventaId}/devoluciones`, {
    metodo: 'POST',
    cuerpo: { ...datos, motivo: datos.motivo.trim(), items },
  })
}
