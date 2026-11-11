// Inventario, ventas y préstamos de M6. Con un usuario real del selector de
// prueba se usa la API NestJS (/m6/...); con los usuarios «Demo local» se
// trabaja con datos en memoria, aislados de la base compartida (se reinician
// al recargar). Las dos rutas devuelven los mismos tipos.

import { pedir, usandoDemoLocal } from '../../../shared/services/cliente-api.ts'
import type {
  DatosProveedor,
  DatosUniforme,
  Proveedor,
  UniformeInventario,
} from '../types/inventario.types.ts'
import { hoyEnClub } from '../../../shared/utils/formato.ts'
import { buscarPatinadores } from '../../m5-planes-tarifas-pagos/services/m5.service.ts'
import { MEDIOS_PAGO } from '../../m5-planes-tarifas-pagos/types/m5.types.ts'
import { erroresTransaccion } from '../../m5-planes-tarifas-pagos/utils/validar-transaccion.ts'
import {
  TIPOS_VENDIBLES,
  type CompradorVenta,
  type DatosDevolucion,
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

// ---------------------------------------------------------------- API real

/** Referencia tal como la devuelve GET /m6/uniformes (proveedor como texto). */
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

/** Cuerpo de POST/PATCH /m6/uniformes: sin campos vacíos que el DTO rechaza. */
function cuerpoUniforme(datos: DatosUniforme) {
  return {
    ...datos,
    referencia: datos.referencia.trim(),
    talla: datos.talla.trim(),
    proveedorId: datos.proveedorId || undefined,
    fotoUrl: datos.fotoUrl?.trim() || null,
  }
}

// ---------------------------------------------------------- Demostración local

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
    tarifaPrestamoDia: TARIFAS_PRESTAMO_DEMO.get(id) ?? 0,
  }
}

/** Tarifa sugerida por unidad y día de los implementos de demostración. */
const TARIFAS_PRESTAMO_DEMO = new Map([[4, 10000], [5, 5000], [6, 5000], [7, 5000], [8, 2000]])

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
let siguienteCobroDemoId = 505
const saldosCobroDemo = new Map<number, number>([[504, 10000]])

function registrarCobroLocal(datos: {
  patinadorId: number
  concepto: string
  descripcion: string
  valor: number
  fechaLimite: string
}): { id: number } {
  if (!Number.isInteger(datos.patinadorId) || datos.patinadorId < 1) {
    throw new Error('Selecciona un patinador válido para asociar el cobro.')
  }
  if (!Number.isSafeInteger(datos.valor) || datos.valor <= 0) {
    throw new Error('El cobro debe ser un valor entero mayor que cero.')
  }
  const fechaLimite = new Date(`${datos.fechaLimite}T00:00:00Z`)
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(datos.fechaLimite) ||
    Number.isNaN(fechaLimite.getTime()) ||
    fechaLimite.toISOString().slice(0, 10) !== datos.fechaLimite
  ) {
    throw new Error('Indica una fecha límite válida.')
  }
  const id = siguienteCobroDemoId++
  saldosCobroDemo.set(id, datos.valor)
  return { id }
}

function saldoCobroLocal(cobroId: number): number | null {
  return saldosCobroDemo.get(cobroId) ?? null
}

function pagarCobroLocal(cobroId: number, monto: number): { comprobante: { numero: string } } {
  const saldo = saldoCobroLocal(cobroId)
  if (saldo === null || saldo <= 0) throw new Error('No se encontró un cobro pendiente.')
  if (!Number.isSafeInteger(monto) || monto <= 0 || monto > saldo) {
    throw new Error('El monto no es válido para el saldo pendiente.')
  }
  saldosCobroDemo.set(cobroId, saldo - monto)
  return { comprobante: { numero: `DEMO-${String(cobroId).padStart(6, '0')}` } }
}

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
  if (!usandoDemoLocal()) {
    return pedir<MovimientoInventario[]>(
      uniformeId === undefined ? '/m6/uniformes/movimientos' : `/m6/uniformes/${uniformeId}/movimientos`,
    )
  }
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
export async function listarInventario(): Promise<UniformeInventario[]> {
  if (!usandoDemoLocal()) {
    const [uniformes, proveedores] = await Promise.all([
      pedir<UniformeApi[]>('/m6/uniformes'),
      pedir<Proveedor[]>('/m6/proveedores'),
    ])
    return uniformes.map((uniforme) => adaptarUniforme(uniforme, proveedores))
  }
  return Promise.resolve(inventarioDemo.map((uniforme) => ({
    ...uniforme,
    proveedor: { ...uniforme.proveedor },
  })))
}

export function listarProveedores(): Promise<Proveedor[]> {
  if (!usandoDemoLocal()) return pedir<Proveedor[]>('/m6/proveedores')
  return Promise.resolve(proveedoresDemo.map((proveedor) => ({ ...proveedor })))
}

export async function crearUniforme(datos: DatosUniforme): Promise<UniformeInventario> {
  validarUniforme(datos)
  if (!usandoDemoLocal()) {
    return uniformeDeApi(pedir<UniformeApi>('/m6/uniformes', { metodo: 'POST', cuerpo: cuerpoUniforme(datos) }))
  }
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
  creado.tarifaPrestamoDia = datos.tipo === 'IMPLEMENTO' ? datos.tarifaPrestamoDia ?? 0 : 0
  inventarioDemo.push(creado)
  if (creado.cantidadDisponible > 0) registrarMovimiento(creado, 'ENTRADA', creado.cantidadDisponible, 'Stock inicial')
  return { ...creado, proveedor: { ...proveedor } }
}

export async function editarUniforme(id: number, datos: DatosUniforme): Promise<UniformeInventario> {
  validarUniforme(datos)
  if (!usandoDemoLocal()) {
    return uniformeDeApi(pedir<UniformeApi>(`/m6/uniformes/${id}`, { metodo: 'PATCH', cuerpo: cuerpoUniforme(datos) }))
  }
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
    tarifaPrestamoDia: datos.tipo === 'IMPLEMENTO' ? datos.tarifaPrestamoDia ?? 0 : 0,
    actualizadoEn: new Date().toISOString(),
  })
  recalcularStock(uniforme)
  if (diferencia !== 0) registrarMovimiento(uniforme, 'AJUSTE', diferencia, 'Ajuste desde edición')
  return { ...uniforme, proveedor: { ...proveedor } }
}

export async function cambiarEstadoUniforme(
  id: number,
  activo: boolean,
  motivo = '',
): Promise<UniformeInventario> {
  if (!activo && !motivo.trim()) throw new Error('Escribe el motivo de la desactivación.')
  if (!usandoDemoLocal()) {
    return uniformeDeApi(pedir<UniformeApi>(
      `/m6/uniformes/${id}/${activo ? 'reactivar' : 'desactivar'}`,
      { metodo: 'POST', cuerpo: activo ? {} : { motivo: motivo.trim() } },
    ))
  }
  const uniforme = inventarioDemo.find((item) => item.id === id)
  if (!uniforme) throw new Error('No se encontró la referencia.')
  uniforme.activo = activo
  return { ...uniforme, proveedor: { ...uniforme.proveedor } }
}

export async function crearProveedor(datos: DatosProveedor): Promise<Proveedor> {
  if (!datos.razonSocial.trim()) throw new Error('El nombre del proveedor es obligatorio.')
  if (!datos.nitDocumento.trim()) throw new Error('El NIT o documento es obligatorio.')
  if (!usandoDemoLocal()) {
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
  if (!usandoDemoLocal()) {
    return pedir<Proveedor>(`/m6/proveedores/${id}/estado`, { metodo: 'PATCH', cuerpo: { activo } })
  }
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
  if (!usandoDemoLocal()) {
    return uniformeDeApi(pedir<UniformeApi>(`/m6/uniformes/${id}/stock`, {
      metodo: 'PATCH',
      cuerpo: { cantidad, observacion: observacion.trim() || undefined },
    }))
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

// --- Préstamo de implementos (HU-6.8 / RF-M6-08) ---
// Mismo contrato que /m6/prestamos: el préstamo genera un cobro en M5 de
// tarifa por unidad y día × cantidad × días previstos (mínimo 1).

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
  /** null cuando la tarifa es 0 y no se generó cobro. */
  cobroId: number | null
  saldoPendiente: number
  fechaPrestamo: string
  fechaDevolucionPrevista: string
  estadoEntrega: 'NUEVO' | 'BUEN_ESTADO' | 'CON_DESGASTE'
  estado: 'ACTIVO' | 'DEVUELTO' | 'PERDIDA_DANO'
  /** Igual a estado, salvo ACTIVO con fecha prevista pasada: VENCIDO. */
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

/** GET /m6/prestamos/patinadores: patinador activo y quién puede responder. */
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

function sumarDias(fecha: string, dias: number): string {
  const valor = new Date(`${fecha}T00:00:00Z`)
  valor.setUTCDate(valor.getUTCDate() + dias)
  return valor.toISOString().slice(0, 10)
}

const patinadoresPrestamoDemo: PatinadorPrestamo[] = [
  { id: 101, nombre: 'Sofía Ramírez', responsables: [{ id: 201, nombre: 'María Ramírez · acudiente' }] },
  { id: 102, nombre: 'Lucas Martínez', responsables: [{ id: 202, nombre: 'Andrea Martínez · acudiente' }] },
  { id: 103, nombre: 'Valentina Torres', responsables: [{ id: 203, nombre: 'Carlos Torres · acudiente' }] },
  { id: 104, nombre: 'Mateo Cárdenas', responsables: [{ id: 204, nombre: 'Laura Cárdenas · acudiente' }] },
  { id: 105, nombre: 'Samuel Rojas', responsables: [{ id: 205, nombre: 'Samuel Rojas · patinador' }] },
  { id: 106, nombre: 'Diego Demo Pago', responsables: [{ id: 206, nombre: 'Paula Demo · acudiente' }] },
]

function estadoActualDemo(prestamo: PrestamoUniformeApi): PrestamoUniformeApi['estadoActual'] {
  return prestamo.estado === 'ACTIVO' && prestamo.fechaDevolucionPrevista < hoyEnClub() ? 'VENCIDO' : prestamo.estado
}

// Préstamo de ejemplo ya vencido, para ver el indicador en la demostración.
let prestamosDemo: PrestamoUniformeApi[] = [{
  id: 500,
  uniformeId: 4,
  uniforme: 'CASCO-PATINAJE · M',
  patinadorId: 101,
  patinador: 'Sofía Ramírez',
  responsableId: 201,
  responsable: 'María Ramírez · acudiente',
  cantidad: 1,
  valorPorUnidad: 10000,
  valorCobro: 50000,
  duracionDias: 5,
  cobroId: 504,
  saldoPendiente: 10000,
  fechaPrestamo: sumarDias(hoyEnClub(), -7),
  fechaDevolucionPrevista: sumarDias(hoyEnClub(), -2),
  estadoEntrega: 'BUEN_ESTADO',
  estado: 'ACTIVO',
  estadoActual: 'ACTIVO',
  fechaRecepcion: null,
  estadoRecepcion: null,
  observacion: null,
}]

export function listarPrestamos(): Promise<PrestamoUniformeApi[]> {
  if (!usandoDemoLocal()) return pedir<PrestamoUniformeApi[]>('/m6/prestamos')
  return Promise.resolve(prestamosDemo
    .map((prestamo) => ({
      ...prestamo,
      estadoActual: estadoActualDemo(prestamo),
      saldoPendiente: prestamo.cobroId === null ? 0 : saldoCobroLocal(prestamo.cobroId) ?? 0,
    }))
    .sort((a, b) => Number(b.estadoActual === 'VENCIDO') - Number(a.estadoActual === 'VENCIDO')))
}

export function listarPatinadoresPrestamo(): Promise<PatinadorPrestamo[]> {
  if (!usandoDemoLocal()) return pedir<PatinadorPrestamo[]>('/m6/prestamos/patinadores')
  return Promise.resolve(patinadoresPrestamoDemo.map((patinador) => ({
    ...patinador,
    responsables: patinador.responsables.map((responsable) => ({ ...responsable })),
  })))
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
  if (!usandoDemoLocal()) return pedir<PrestamoUniformeApi>('/m6/prestamos', { metodo: 'POST', cuerpo: datos })

  const uniforme = inventarioDemo.find((item) => item.id === datos.uniformeId && item.activo)
  if (!uniforme || uniforme.tipo !== 'IMPLEMENTO') {
    throw new Error('Solo se pueden prestar implementos; las prendas quedan disponibles para venta.')
  }
  if (uniforme.cantidadDisponible < datos.cantidad) throw new Error('No hay cantidad suficiente para realizar el préstamo.')
  const patinador = patinadoresPrestamoDemo.find((item) => item.id === datos.patinadorId)
  const responsable = patinador?.responsables.find((item) => item.id === datos.responsableId)
  if (!patinador || !responsable) {
    throw new Error('El patinador debe estar activo y el responsable debe ser él mismo o un acudiente vinculado.')
  }
  const duracionDias = diasPrestamo(datos.fechaDevolucionPrevista)
  const valorCobro = Math.round(datos.valorPorUnidad * datos.cantidad * duracionDias)
  const cobro = valorCobro > 0
    ? registrarCobroLocal({
        patinadorId: datos.patinadorId,
        concepto: 'Préstamo de implemento',
        descripcion: `${uniforme.referencia} · ${datos.cantidad} unidad${datos.cantidad === 1 ? '' : 'es'} · ${duracionDias} días`,
        valor: valorCobro,
        fechaLimite: datos.fechaDevolucionPrevista,
      })
    : null
  uniforme.cantidadDisponible -= datos.cantidad
  recalcularStock(uniforme)
  registrarMovimiento(uniforme, 'PRESTAMO', -datos.cantidad, 'Préstamo registrado')
  const prestamo: PrestamoUniformeApi = {
    id: siguientePrestamoId++,
    ...datos,
    uniforme: `${uniforme.referencia} · ${uniforme.talla}`,
    patinador: patinador.nombre,
    responsable: responsable.nombre,
    valorCobro,
    duracionDias,
    cobroId: cobro?.id ?? null,
    saldoPendiente: valorCobro,
    fechaPrestamo: hoyEnClub(),
    estado: 'ACTIVO',
    estadoActual: 'ACTIVO',
    fechaRecepcion: null,
    estadoRecepcion: null,
    observacion: null,
  }
  prestamosDemo = [prestamo, ...prestamosDemo]
  return { ...prestamo }
}

export async function recibirPrestamo(id: number, datos: DatosRecepcion): Promise<PrestamoUniformeApi> {
  if (datos.estado === 'PERDIDA_DANO' && !datos.observacion?.trim()) {
    throw new Error('Debes explicar la pérdida o el daño.')
  }
  if (!usandoDemoLocal()) {
    return pedir<PrestamoUniformeApi>(`/m6/prestamos/${id}/recibir`, {
      metodo: 'PATCH',
      cuerpo: { ...datos, observacion: datos.observacion?.trim() || undefined },
    })
  }
  const prestamo = prestamosDemo.find((item) => item.id === id && item.estado === 'ACTIVO')
  if (!prestamo) throw new Error('Préstamo activo no encontrado.')
  prestamo.estado = datos.estado
  prestamo.estadoActual = datos.estado
  prestamo.fechaRecepcion = hoyEnClub()
  prestamo.estadoRecepcion = datos.estadoRecepcion ?? (datos.estado === 'DEVUELTO' ? 'BUEN_ESTADO' : 'DANADO')
  prestamo.observacion = datos.observacion?.trim() || null
  if (datos.estado === 'DEVUELTO') {
    const uniforme = inventarioDemo.find((item) => item.id === prestamo.uniformeId)
    if (!uniforme) throw new Error('No se encontró el implemento del préstamo.')
    uniforme.cantidadDisponible += prestamo.cantidad
    recalcularStock(uniforme)
    registrarMovimiento(uniforme, 'DEVOLUCION', prestamo.cantidad, 'Devolución registrada')
  }
  return { ...prestamo }
}

// --- Venta de uniformes (HU-6.7 / RF-M6-07) ---
// Misma secuencia que POST /m6/ventas en NestJS: se valida todo antes de tocar
// datos; luego se registra el cobro y el pago en M5 (comprobante), se descuenta
// el stock y queda el movimiento VENTA en el Kardex. Una venta confirmada no se
// edita: no existe función para modificarla ni para borrarla.

let siguienteVentaId = 1
let ventasDemo: VentaRegistrada[] = []

export function listarVentas(): Promise<VentaRegistrada[]> {
  if (!usandoDemoLocal()) return pedir<VentaRegistrada[]>('/m6/ventas')
  return Promise.resolve(ventasDemo.map(copiaVenta))
}

export async function listarCompradoresVenta(): Promise<CompradorVenta[]> {
  if (!usandoDemoLocal()) return pedir<CompradorVenta[]>('/m6/ventas/compradores')
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
  if (!usandoDemoLocal()) {
    // El servidor valida existencias, precios y medio de pago en una sola transacción.
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
  const pago = pagarCobroLocal(cobro.id, total)

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
    estado: 'CONFIRMADA',
    valorDevuelto: 0,
    items: lineas.map((linea) => ({ ...linea, devuelto: 0 })),
    devoluciones: [],
  }
  ventasDemo = [venta, ...ventasDemo]
  return copiaVenta(venta)
}

function copiaVenta(venta: VentaRegistrada): VentaRegistrada {
  return {
    ...venta,
    items: venta.items.map((item) => ({ ...item })),
    devoluciones: venta.devoluciones.map((devolucion) => ({ ...devolucion, items: devolucion.items.map((i) => ({ ...i })) })),
  }
}

/**
 * Devolución total o parcial (HU-6.7), misma regla que el servidor: no se
 * devuelve más de lo pendiente, el stock regresa y, si una sola devolución
 * cubre toda la venta, se anula su pago. La venta original no se modifica.
 */
export async function registrarDevolucion(ventaId: number, datos: DatosDevolucion): Promise<VentaRegistrada> {
  if (datos.motivo.trim().length < 3) throw new Error('Escribe el motivo de la devolución.')
  if (!MEDIOS_PAGO.some((medio) => medio.valor === datos.medioReembolso)) throw new Error('Elige el medio del reembolso.')
  const items = consolidarItemsVenta(datos.items.filter((item) => item.cantidad > 0))
  if (items.length === 0) throw new Error('Indica al menos una unidad a devolver.')
  if (!usandoDemoLocal()) {
    return pedir<VentaRegistrada>(`/m6/ventas/${ventaId}/devoluciones`, {
      metodo: 'POST',
      cuerpo: { ...datos, motivo: datos.motivo.trim(), items },
    })
  }

  const venta = ventasDemo.find((item) => item.id === ventaId)
  if (!venta) throw new Error('Venta no encontrada.')
  if (venta.estadoPago === 'ANULADO') throw new Error('El pago de esta venta está anulado; no admite devoluciones.')
  const lineas = items.map((item) => {
    const vendida = venta.items.find((linea) => linea.uniformeId === item.uniformeId)
    if (!vendida) throw new Error('Una de las referencias no pertenece a esta venta.')
    const pendiente = vendida.cantidad - vendida.devuelto
    if (!Number.isInteger(item.cantidad) || item.cantidad > pendiente) {
      throw new Error(`Solo quedan ${pendiente} unidades de ${vendida.referencia} talla ${vendida.talla} por devolver.`)
    }
    return { vendida, cantidad: item.cantidad, subtotal: item.cantidad * vendida.valorUnitario }
  })
  const sinPrevias = venta.devoluciones.length === 0
  const valorDevuelto = lineas.reduce((suma, linea) => suma + linea.subtotal, 0)
  for (const linea of lineas) {
    linea.vendida.devuelto += linea.cantidad
    const uniforme = inventarioDemo.find((ref) => ref.id === linea.vendida.uniformeId)
    if (uniforme) {
      uniforme.cantidadDisponible += linea.cantidad
      recalcularStock(uniforme)
      registrarMovimiento(uniforme, 'DEVOLUCION', linea.cantidad, `Devolución de la venta #${ventaId}: ${datos.motivo.trim()}`)
    }
  }
  const completa = venta.items.every((item) => item.devuelto === item.cantidad)
  const anulaPago = completa && sinPrevias
  venta.devoluciones.push({
    id: venta.devoluciones.length + 1,
    fecha: hoyEnClub(),
    motivo: datos.motivo.trim(),
    valorDevuelto,
    medioReembolso: datos.medioReembolso,
    anulaPago,
    registradoPor: 'Andrea Administradora (demo)',
    items: lineas.map((linea) => ({
      uniformeId: linea.vendida.uniformeId,
      referencia: linea.vendida.referencia,
      talla: linea.vendida.talla,
      cantidad: linea.cantidad,
      subtotal: linea.subtotal,
    })),
  })
  venta.valorDevuelto += valorDevuelto
  venta.estado = completa ? 'DEVUELTA' : 'DEVUELTA_PARCIAL'
  if (anulaPago) venta.estadoPago = 'ANULADO'
  return copiaVenta(venta)
}
