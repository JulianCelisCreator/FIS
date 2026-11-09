// Datos locales de demostración para el adelanto de M6, aislados de la base compartida.

import type {
  DatosProveedor,
  DatosUniforme,
  Proveedor,
  UniformeInventario,
} from '../types/inventario.types.ts'
import { hoyEnClub } from '../../../shared/utils/formato.ts'
import {
  buscarPatinadores,
  pagarCobro,
  registrarCobroLocal,
  saldoCobroLocal,
} from '../../m5-planes-tarifas-pagos/services/m5.service.ts'
import { MEDIOS_PAGO } from '../../m5-planes-tarifas-pagos/types/m5.types.ts'
import { erroresTransaccion } from '../../m5-planes-tarifas-pagos/utils/validar-transaccion.ts'
import {
  TIPOS_VENDIBLES,
  type CompradorVenta,
  type DatosVenta,
  type LineaVenta,
  type VentaRegistrada,
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

const PROVEEDOR_DEMO: Proveedor = {
  id: 1,
  razonSocial: 'Implementos Velora',
  nitDocumento: '900123456-1',
  correo: 'ventas@implementosvelora.test',
  telefono: '3001234567',
  activo: true,
  creadoEn: '2026-01-15',
}

let proveedoresDemo: Proveedor[] = [PROVEEDOR_DEMO]

function uniformeDemo(
  id: number,
  referencia: string,
  tipo: DatosUniforme['tipo'],
  talla: string,
  cantidadDisponible: number,
  cantidadMinima: number,
  fotoUrl: string | null = null,
  costo = 45000,
  precioVenta = 60000,
): UniformeInventario {
  return {
    id,
    referencia,
    tipo,
    talla,
    proveedorId: PROVEEDOR_DEMO.id,
    costo,
    precioVenta,
    cantidadDisponible,
    cantidadMinima,
    activo: true,
    actualizadoEn: '2026-11-01',
    fotoUrl,
    estadoStock: cantidadDisponible <= cantidadMinima ? 'ALERTA_MINIMO' : 'STOCK_NORMAL',
    proveedor: PROVEEDOR_DEMO,
  }
}

let inventarioDemo: UniformeInventario[] = [
  uniformeDemo(1, 'CAMISETA-OFICIAL', 'CAMISETA', 'M', 14, 4, '/stock/camisa.jfif', 38000, 55000),
  uniformeDemo(2, 'CHAQUETA-CLUB', 'CHAQUETA', 'S', 6, 2, '/stock/chaqueta.jfif', 90000, 125000),
  uniformeDemo(3, 'PANTALONETA-CLUB', 'PANTALON', 'M', 9, 3, '/stock/pantaloneta.jfif', 42000, 65000),
  uniformeDemo(4, 'CASCO-PATINAJE', 'IMPLEMENTO', 'M', 6, 2, null, 85000, 0),
  uniformeDemo(5, 'RODILLERAS-PATINAJE', 'IMPLEMENTO', 'M', 11, 3, null, 42000, 0),
  uniformeDemo(6, 'CODERAS-PATINAJE', 'IMPLEMENTO', 'M', 8, 2, null, 35000, 0),
  uniformeDemo(7, 'MUNEQUERAS-PATINAJE', 'IMPLEMENTO', 'M', 7, 2, null, 28000, 0),
  uniformeDemo(8, 'CONOS-ENTRENAMIENTO', 'IMPLEMENTO', 'UNICA', 18, 5, null, 5000, 0),
]

let siguienteUniformeId = 9
let siguienteProveedorId = 2
let siguienteMovimientoId = 1
let siguientePrestamoId = 501
let movimientosDemo: MovimientoInventario[] = []

function recalcularStock(uniforme: UniformeInventario): void {
  uniforme.estadoStock = uniforme.cantidadDisponible <= uniforme.cantidadMinima
    ? 'ALERTA_MINIMO'
    : 'STOCK_NORMAL'
}

function registrarMovimiento(
  uniforme: UniformeInventario,
  tipo: MovimientoInventario['tipo'],
  cantidad: number,
  observacion: string | null,
): void {
  movimientosDemo.unshift({
    id: siguienteMovimientoId++,
    uniformeId: uniforme.id,
    referencia: uniforme.referencia,
    tipo,
    cantidad,
    observacion,
    registradoPor: 'Andrea Administradora (demo)',
    registradoEn: new Date().toISOString(),
  })
}

export function listarMovimientos(uniformeId?: number): Promise<MovimientoInventario[]> {
  return Promise.resolve(movimientosDemo
    .filter((movimiento) => uniformeId === undefined || movimiento.uniformeId === uniformeId)
    .map((movimiento) => ({ ...movimiento })))
}

function normalizarReferencia(referencia: string): string {
  return referencia.trim().toUpperCase()
}

function validarUniforme(datos: DatosUniforme) {
  const referencia = normalizarReferencia(datos.referencia)
  const talla = datos.talla.trim().toUpperCase()

  if (!referencia) throw new Error('La referencia es obligatoria.')
  if (!datos.tipo) throw new Error('El tipo de uniforme es obligatorio.')
  if (!talla) throw new Error('La talla es obligatoria.')
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

/** Referencias ficticias para presentar el inventario sin consultar la base compartida. */
export function listarInventario(): Promise<UniformeInventario[]> {
  return Promise.resolve(inventarioDemo.map((uniforme) => ({
    ...uniforme,
    proveedor: { ...uniforme.proveedor },
  })))
}

export function listarProveedores(): Promise<Proveedor[]> {
  return Promise.resolve(proveedoresDemo.map((proveedor) => ({ ...proveedor })))
}

export async function crearUniforme(datos: DatosUniforme): Promise<UniformeInventario> {
  validarUniforme(datos)
  const referencia = normalizarReferencia(datos.referencia)
  if (inventarioDemo.some((uniforme) => uniforme.referencia === referencia)) {
    throw new Error('Ya existe una referencia con ese código.')
  }
  if (datos.tipo !== 'IMPLEMENTO' && inventarioDemo.some((uniforme) =>
    uniforme.tipo === datos.tipo &&
    uniforme.talla.toUpperCase() === datos.talla.trim().toUpperCase() &&
    uniforme.proveedorId === datos.proveedorId,
  )) {
    throw new Error('Ya existe una referencia de ese tipo y talla con este proveedor.')
  }
  const proveedor = proveedoresDemo.find((item) => item.id === datos.proveedorId && item.activo)
  if (!proveedor) throw new Error('Elige un proveedor activo.')
  const creado = uniformeDemo(
    siguienteUniformeId++, referencia, datos.tipo, datos.talla.trim().toUpperCase(),
    datos.cantidadDisponible, datos.cantidadMinima, datos.fotoUrl?.trim() || null,
    datos.costo, datos.precioVenta,
  )
  creado.proveedorId = proveedor.id
  creado.proveedor = proveedor
  inventarioDemo.push(creado)
  if (creado.cantidadDisponible > 0) registrarMovimiento(creado, 'ENTRADA', creado.cantidadDisponible, 'Stock inicial')
  return { ...creado, proveedor: { ...proveedor } }
}

export async function editarUniforme(id: number, datos: DatosUniforme): Promise<UniformeInventario> {
  validarUniforme(datos)
  const uniforme = inventarioDemo.find((item) => item.id === id)
  if (!uniforme) throw new Error('No se encontró la referencia.')
  const proveedor = proveedoresDemo.find((item) => item.id === datos.proveedorId)
  if (!proveedor) throw new Error('No se encontró el proveedor.')
  const referencia = normalizarReferencia(datos.referencia)
  if (inventarioDemo.some((item) => item.id !== id && item.referencia === referencia)) {
    throw new Error('Ya existe una referencia con ese código.')
  }
  if (datos.tipo !== 'IMPLEMENTO' && inventarioDemo.some((item) =>
    item.id !== id &&
    item.tipo === datos.tipo &&
    item.talla.toUpperCase() === datos.talla.trim().toUpperCase() &&
    item.proveedorId === datos.proveedorId,
  )) {
    throw new Error('Ya existe una referencia de ese tipo y talla con este proveedor.')
  }
  const diferencia = datos.cantidadDisponible - uniforme.cantidadDisponible
  Object.assign(uniforme, {
    referencia,
    tipo: datos.tipo,
    talla: datos.talla.trim().toUpperCase(),
    proveedorId: proveedor.id,
    proveedor,
    costo: datos.costo,
    precioVenta: datos.precioVenta,
    cantidadDisponible: datos.cantidadDisponible,
    cantidadMinima: datos.cantidadMinima,
    fotoUrl: datos.fotoUrl?.trim() || null,
    actualizadoEn: new Date().toISOString(),
  })
  recalcularStock(uniforme)
  if (diferencia !== 0) registrarMovimiento(uniforme, 'AJUSTE', diferencia, 'Ajuste desde edición')
  return { ...uniforme, proveedor: { ...proveedor } }
}

export async function cambiarEstadoUniforme(id: number, activo: boolean): Promise<UniformeInventario> {
  const uniforme = inventarioDemo.find((item) => item.id === id)
  if (!uniforme) throw new Error('No se encontró la referencia.')
  uniforme.activo = activo
  return { ...uniforme, proveedor: { ...uniforme.proveedor } }
}

export async function crearProveedor(datos: DatosProveedor): Promise<Proveedor> {
  if (!datos.razonSocial.trim()) throw new Error('El nombre del proveedor es obligatorio.')
  if (!datos.nitDocumento.trim()) throw new Error('El NIT o documento es obligatorio.')
  if (proveedoresDemo.some((proveedor) => proveedor.nitDocumento === datos.nitDocumento.trim())) {
    throw new Error('Ya existe un proveedor con ese NIT o documento.')
  }
  const proveedor: Proveedor = {
    id: siguienteProveedorId++,
    razonSocial: datos.razonSocial.trim(),
    nitDocumento: datos.nitDocumento.trim(),
    correo: datos.correo?.trim() || null,
    telefono: datos.telefono?.trim() || null,
    activo: true,
    creadoEn: new Date().toISOString(),
  }
  proveedoresDemo.push(proveedor)
  return { ...proveedor }
}

export async function cambiarEstadoProveedor(id: number, activo: boolean): Promise<Proveedor> {
  const proveedor = proveedoresDemo.find((item) => item.id === id)
  if (!proveedor) throw new Error('No se encontró el proveedor.')
  proveedor.activo = activo
  return { ...proveedor }
}

export async function ajustarStock(
  id: number,
  cantidad: number,
  observacion: string,
): Promise<UniformeInventario> {
  if (!Number.isInteger(cantidad) || cantidad === 0) {
    throw new Error('El ajuste debe ser un número entero distinto de cero.')
  }
  const uniforme = inventarioDemo.find((item) => item.id === id)
  if (!uniforme) throw new Error('No se encontró la referencia.')
  if (uniforme.cantidadDisponible + cantidad < 0) throw new Error('El ajuste no puede dejar el stock negativo.')
  uniforme.cantidadDisponible += cantidad
  uniforme.actualizadoEn = new Date().toISOString()
  recalcularStock(uniforme)
  registrarMovimiento(uniforme, 'AJUSTE', cantidad, observacion.trim() || null)
  return { ...uniforme, proveedor: { ...uniforme.proveedor } }
}

export interface PrestamoUniformeApi {
  id: number
  uniformeId: number
  patinadorId: number
  responsableId: number
  cantidad: number
  valorPorUnidad: number
  valorCobro: number
  duracionDias: number
  cobroId: number
  saldoPendiente: number
  fechaPrestamo: string
  fechaDevolucionPrevista: string
  estadoEntrega: 'NUEVO' | 'BUEN_ESTADO' | 'CON_DESGASTE'
  estado: 'ACTIVO' | 'DEVUELTO' | 'PERDIDA_DANO'
  fechaRecepcion: string | null
  estadoRecepcion: 'BUEN_ESTADO' | 'CON_DESGASTE' | 'DANADO' | null
  observacion: string | null
  uniforme: string
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

export interface PatinadorPrestamo {
  id: number
  nombre: string
}

export interface ResponsablePrestamo {
  id: number
  nombre: string
}

const responsableDemo: ResponsablePrestamo[] = [
  { id: 201, nombre: 'María Ramírez · acudiente de Sofía' },
  { id: 202, nombre: 'Andrea Martínez · acudiente de Lucas' },
  { id: 203, nombre: 'Carlos Torres · acudiente de Valentina' },
  { id: 204, nombre: 'Laura Cárdenas · acudiente de Mateo' },
  { id: 205, nombre: 'Samuel Rojas · patinador' },
  { id: 206, nombre: 'Paula Demo · acudiente de Diego' },
]

const patinadorDemo: PatinadorPrestamo[] = [
  { id: 101, nombre: 'Sofía Ramírez' },
  { id: 102, nombre: 'Lucas Martínez' },
  { id: 103, nombre: 'Valentina Torres' },
  { id: 104, nombre: 'Mateo Cárdenas' },
  { id: 105, nombre: 'Samuel Rojas' },
  { id: 106, nombre: 'Diego Demo Pago' },
]
const responsablePorPatinador = new Map([
  [101, 201],
  [102, 202],
  [103, 203],
  [104, 204],
  [105, 205],
  [106, 206],
])

const TARIFAS_PRESTAMO_DEMO = new Map([
  [4, 10000],
  [5, 5000],
  [6, 5000],
  [7, 5000],
  [8, 2000],
])

export function valorPrestamoPorUnidad(uniformeId: number): number {
  return TARIFAS_PRESTAMO_DEMO.get(uniformeId) ?? 5000
}

export function diasPrestamo(fechaDevolucionPrevista: string, fechaPrestamo = hoyEnClub()): number {
  const inicio = new Date(`${fechaPrestamo}T00:00:00Z`)
  const fin = new Date(`${fechaDevolucionPrevista}T00:00:00Z`)
  return Math.max(1, Math.round((fin.getTime() - inicio.getTime()) / 86400000))
}

function sumarDias(fecha: string, dias: number): string {
  const valor = new Date(`${fecha}T00:00:00Z`)
  valor.setUTCDate(valor.getUTCDate() + dias)
  return valor.toISOString().slice(0, 10)
}

let prestamosDemo: PrestamoUniformeApi[] = [{
  id: 500,
  uniformeId: 4,
  patinadorId: 101,
  responsableId: 201,
  cantidad: 1,
  valorPorUnidad: 10000,
  valorCobro: 50000,
  duracionDias: 5,
  cobroId: 504,
  saldoPendiente: 10000,
  fechaPrestamo: hoyEnClub(),
  fechaDevolucionPrevista: sumarDias(hoyEnClub(), 5),
  estadoEntrega: 'BUEN_ESTADO',
  estado: 'ACTIVO',
  fechaRecepcion: null,
  estadoRecepcion: null,
  observacion: null,
  uniforme: 'CASCO-PATINAJE',
}]

export function listarPrestamos(): Promise<PrestamoUniformeApi[]> {
  return Promise.resolve(prestamosDemo.map((prestamo) => ({
    ...prestamo,
    saldoPendiente: saldoCobroLocal(prestamo.cobroId) ?? 0,
  })))
}

export function listarPatinadoresPrestamo(): Promise<PatinadorPrestamo[]> {
  return Promise.resolve(patinadorDemo.map((patinador) => ({ ...patinador })))
}

export function listarResponsablesPrestamo(): Promise<ResponsablePrestamo[]> {
  return Promise.resolve(responsableDemo.map((responsable) => ({ ...responsable })))
}

export function crearPrestamo(datos: DatosPrestamo): Promise<PrestamoUniformeApi> {
  if (!Number.isInteger(datos.uniformeId) || datos.uniformeId < 1) {
    throw new Error('Selecciona un implemento disponible.')
  }
  if (!Number.isInteger(datos.patinadorId) || datos.patinadorId < 1) {
    throw new Error('Selecciona un patinador.')
  }
  if (!Number.isInteger(datos.responsableId) || datos.responsableId < 1) {
    throw new Error('Selecciona un responsable.')
  }
  if (!Number.isSafeInteger(datos.cantidad) || datos.cantidad < 1) {
    throw new Error('La cantidad debe ser un entero mayor que cero.')
  }
  if (!Number.isSafeInteger(datos.valorPorUnidad) || datos.valorPorUnidad <= 0) {
    throw new Error('El valor por implemento debe ser un entero mayor que cero.')
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(datos.fechaDevolucionPrevista)) {
    throw new Error('Indica una fecha de devolución válida.')
  }
  const fecha = new Date(`${datos.fechaDevolucionPrevista}T00:00:00Z`)
  if (Number.isNaN(fecha.getTime()) || fecha.toISOString().slice(0, 10) !== datos.fechaDevolucionPrevista) {
    throw new Error('Indica una fecha de devolución válida.')
  }
  if (datos.fechaDevolucionPrevista < hoyEnClub()) {
    throw new Error('La fecha prevista debe ser hoy o posterior.')
  }
  const uniforme = inventarioDemo.find((item) => item.id === datos.uniformeId && item.activo)
  if (!uniforme || uniforme.tipo !== 'IMPLEMENTO') throw new Error('Elige un implemento activo.')
  if (uniforme.cantidadDisponible < datos.cantidad) throw new Error('No hay cantidad suficiente para el préstamo.')
  if (!patinadorDemo.some((item) => item.id === datos.patinadorId)) throw new Error('Selecciona un patinador de prueba.')
  if (!responsableDemo.some((item) => item.id === datos.responsableId)) throw new Error('Selecciona un responsable de prueba.')
  if (responsablePorPatinador.get(datos.patinadorId) !== datos.responsableId) {
    throw new Error('El responsable seleccionado no está vinculado a ese patinador.')
  }
  const duracionDias = diasPrestamo(datos.fechaDevolucionPrevista)
  const valorCobro = datos.valorPorUnidad * datos.cantidad * duracionDias
  if (!Number.isSafeInteger(valorCobro)) {
    throw new Error('El total del préstamo supera el valor permitido.')
  }
  const cobro = registrarCobroLocal({
    patinadorId: datos.patinadorId,
    concepto: 'Préstamo de implemento',
    descripcion: `${uniforme.referencia} · ${datos.cantidad} unidad${datos.cantidad === 1 ? '' : 'es'} · ${duracionDias} días`,
    valor: valorCobro,
    fechaLimite: datos.fechaDevolucionPrevista,
  })
  uniforme.cantidadDisponible -= datos.cantidad
  recalcularStock(uniforme)
  registrarMovimiento(uniforme, 'PRESTAMO', -datos.cantidad, 'Préstamo de demostración')
  const prestamo: PrestamoUniformeApi = {
    id: siguientePrestamoId++,
    ...datos,
    valorCobro,
    duracionDias,
    cobroId: cobro.id,
    saldoPendiente: valorCobro,
    fechaPrestamo: hoyEnClub(),
    estado: 'ACTIVO',
    fechaRecepcion: null,
    estadoRecepcion: null,
    observacion: null,
    uniforme: uniforme.referencia,
  }
  prestamosDemo = [prestamo, ...prestamosDemo]
  return Promise.resolve({ ...prestamo })
}

export function recibirPrestamo(
  id: number,
  datos: {
    estado: 'DEVUELTO' | 'PERDIDA_DANO'
    estadoRecepcion?: 'BUEN_ESTADO' | 'CON_DESGASTE' | 'DANADO'
    observacion?: string
  },
): Promise<{ uniformeId: number; cantidad: number }> {
  const prestamo = prestamosDemo.find((item) => item.id === id && item.estado === 'ACTIVO')
  if (!prestamo) throw new Error('No se encontró un préstamo activo.')
  if (datos.estado === 'PERDIDA_DANO' && !datos.observacion?.trim()) {
    throw new Error('Describe la pérdida o el daño.')
  }
  prestamo.estado = datos.estado
  prestamo.fechaRecepcion = hoyEnClub()
  prestamo.estadoRecepcion = datos.estadoRecepcion ?? (datos.estado === 'DEVUELTO' ? 'BUEN_ESTADO' : 'DANADO')
  prestamo.observacion = datos.observacion ?? null
  if (datos.estado === 'DEVUELTO') {
    const uniforme = inventarioDemo.find((item) => item.id === prestamo.uniformeId)
    if (!uniforme) throw new Error('No se encontró el implemento del préstamo.')
    uniforme.cantidadDisponible += prestamo.cantidad
    recalcularStock(uniforme)
    registrarMovimiento(uniforme, 'DEVOLUCION', prestamo.cantidad, 'Devolución de demostración')
  }
  return Promise.resolve({ uniformeId: prestamo.uniformeId, cantidad: prestamo.cantidad })
}

// --- Venta de uniformes (HU-6.7 / RF-M6-07) ---
// Misma secuencia que POST /m6/ventas en NestJS: se valida todo antes de tocar
// datos; luego se registra el cobro y el pago en M5 (comprobante), se descuenta
// el stock y queda el movimiento VENTA en el Kardex. Una venta confirmada no se
// edita: no existe función para modificarla ni para borrarla.

let siguienteVentaId = 1
let ventasDemo: VentaRegistrada[] = []

export function listarVentas(): Promise<VentaRegistrada[]> {
  return Promise.resolve(ventasDemo.map((venta) => ({ ...venta, items: venta.items.map((item) => ({ ...item })) })))
}

export async function listarCompradoresVenta(): Promise<CompradorVenta[]> {
  const patinadores = await buscarPatinadores()
  return patinadores.map((patinador) => ({
    patinadorId: patinador.id,
    patinador: patinador.nombre,
    documento: `${patinador.tipoDocumento} ${patinador.numeroDocumento}`,
    acudientes: patinador.acudientes.map((acudiente) => ({ ...acudiente })),
  }))
}

/** Une las líneas repetidas de una misma referencia sumando sus cantidades. */
export function consolidarItemsVenta(items: DatosVenta['items']): DatosVenta['items'] {
  const porUniforme = new Map<number, number>()
  for (const item of items) porUniforme.set(item.uniformeId, (porUniforme.get(item.uniformeId) ?? 0) + item.cantidad)
  return [...porUniforme.entries()].map(([uniformeId, cantidad]) => ({ uniformeId, cantidad }))
}

export async function registrarVenta(datos: DatosVenta): Promise<VentaRegistrada> {
  const hoy = hoyEnClub()
  const compradores = await listarCompradoresVenta()
  const comprador = compradores.find((item) => item.patinadorId === datos.patinadorId)
  if (!comprador) throw new Error('Selecciona un patinador registrado y activo.')
  const acudiente = datos.compradorTipo === 'ACUDIENTE'
    ? comprador.acudientes.find((item) => item.id === datos.acudienteId)
    : undefined
  if (datos.compradorTipo === 'ACUDIENTE' && !acudiente) {
    throw new Error('El acudiente no está vinculado a ese patinador.')
  }
  if (!MEDIOS_PAGO.some((medio) => medio.valor === datos.medioPago)) throw new Error('Elige el medio de pago.')
  const errorPago = Object.values(erroresTransaccion(
    { fechaPago: hoy, medioPago: datos.medioPago, referencia: datos.referenciaPago ?? '' },
    hoy,
  ))[0]
  if (errorPago) throw new Error(errorPago)

  const items = consolidarItemsVenta(datos.items)
  if (items.length === 0) throw new Error('Agrega al menos un uniforme a la venta.')
  const lineas: LineaVenta[] = items.map((item) => {
    if (!Number.isSafeInteger(item.cantidad) || item.cantidad < 1) {
      throw new Error('Cada cantidad debe ser un entero mayor que cero.')
    }
    const uniforme = inventarioDemo.find((ref) => ref.id === item.uniformeId)
    if (!uniforme || !uniforme.activo) throw new Error('Una de las referencias no existe o está desactivada.')
    if (!(TIPOS_VENDIBLES as readonly string[]).includes(uniforme.tipo)) {
      throw new Error(`${uniforme.referencia} es un implemento de préstamo y no se vende.`)
    }
    if (!(uniforme.precioVenta > 0)) throw new Error(`${uniforme.referencia} no tiene precio de venta registrado.`)
    if (item.cantidad > uniforme.cantidadDisponible) {
      throw new Error(
        `Existencias insuficientes para ${uniforme.referencia} talla ${uniforme.talla}: ` +
        `se solicitan ${item.cantidad} y solo hay ${uniforme.cantidadDisponible} disponibles.`,
      )
    }
    return {
      uniformeId: uniforme.id,
      referencia: uniforme.referencia,
      talla: uniforme.talla,
      cantidad: item.cantidad,
      valorUnitario: uniforme.precioVenta,
      subtotal: uniforme.precioVenta * item.cantidad,
    }
  })
  const total = lineas.reduce((suma, linea) => suma + linea.subtotal, 0)
  if (!Number.isSafeInteger(total) || total <= 0) throw new Error('El total de la venta no es válido.')

  const descripcion = `Venta de uniformes: ${lineas.map((linea) => `${linea.referencia} (${linea.talla}) x${linea.cantidad}`).join(', ')}`
  const cobro = registrarCobroLocal({
    patinadorId: datos.patinadorId,
    concepto: 'Venta de uniformes',
    descripcion,
    valor: total,
    fechaLimite: hoy,
  })
  const pago = await pagarCobro({
    cobroId: cobro.id,
    monto: total,
    fechaPago: hoy,
    medioPago: datos.medioPago,
    referencia: datos.referenciaPago?.trim() || undefined,
  })

  const ventaId = siguienteVentaId++
  for (const linea of lineas) {
    const uniforme = inventarioDemo.find((ref) => ref.id === linea.uniformeId)
    if (!uniforme) continue
    uniforme.cantidadDisponible -= linea.cantidad
    uniforme.actualizadoEn = new Date().toISOString()
    recalcularStock(uniforme)
    registrarMovimiento(uniforme, 'VENTA', -linea.cantidad, `Venta #${ventaId}`)
  }

  const venta: VentaRegistrada = {
    id: ventaId,
    fecha: hoy,
    patinadorId: comprador.patinadorId,
    patinador: comprador.patinador,
    compradorTipo: datos.compradorTipo,
    comprador: acudiente?.nombre ?? comprador.patinador,
    medioPago: datos.medioPago,
    referenciaPago: datos.referenciaPago?.trim() || null,
    total,
    comprobante: pago.comprobante.numero,
    estadoPago: 'REGISTRADO',
    registradoPor: 'Andrea Administradora (demo)',
    registradoEn: new Date().toISOString(),
    items: lineas,
  }
  ventasDemo = [venta, ...ventasDemo]
  return { ...venta, items: lineas.map((linea) => ({ ...linea })) }
}
