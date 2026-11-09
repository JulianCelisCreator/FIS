// Cliente HTTP del inventario de uniformes (RF-M6-06).

import type {
  DatosProveedor,
  DatosUniforme,
  EstadoStock,
  Proveedor,
  UniformeInventario,
} from '../types/inventario.types.ts'
import { pedir } from '../../../shared/services/cliente-api.ts'

interface UniformeInventarioApi {
  id: number
  referencia: string
  tipo: DatosUniforme['tipo']
  talla: string
  proveedorId: number | null
  proveedor: string | null
  costo: number
  precioVenta: number
  cantidadDisponible: number
  cantidadMinima: number
  estadoStock: EstadoStock
  activo: boolean
}

function mapearUniforme(fila: UniformeInventarioApi): UniformeInventario {
  const proveedorId = fila.proveedorId ?? 0
  return {
    id: fila.id,
    referencia: fila.referencia,
    tipo: fila.tipo,
    talla: fila.talla,
    proveedorId,
    costo: Number(fila.costo),
    precioVenta: Number(fila.precioVenta),
    cantidadDisponible: Number(fila.cantidadDisponible),
    cantidadMinima: Number(fila.cantidadMinima),
    activo: fila.activo,
    actualizadoEn: '',
    estadoStock: fila.estadoStock,
    proveedor: {
      id: proveedorId,
      razonSocial: fila.proveedor ?? 'Sin proveedor asignado',
      nitDocumento: '',
      correo: null,
      telefono: null,
      activo: true,
      creadoEn: '',
    },
  }
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

/** Todas las referencias, incluidas las inactivas (que conservan su historial). */
export async function listarInventario(): Promise<UniformeInventario[]> {
  const filas = await pedir<UniformeInventarioApi[]>('/m6/uniformes')
  return filas.map(mapearUniforme)
}

export async function listarProveedores(): Promise<Proveedor[]> {
  return pedir<Proveedor[]>('/m6/proveedores')
}

export async function crearUniforme(datos: DatosUniforme): Promise<UniformeInventario> {
  validarUniforme(datos)
  const creado = await pedir<UniformeInventarioApi>('/m6/uniformes', {
    metodo: 'POST',
    cuerpo: {
      referencia: normalizarReferencia(datos.referencia),
      tipo: datos.tipo,
      talla: datos.talla.trim().toUpperCase(),
      proveedorId: datos.proveedorId ?? null,
      costo: datos.costo,
      precioVenta: datos.precioVenta,
      cantidadDisponible: datos.cantidadDisponible,
      cantidadMinima: datos.cantidadMinima,
    },
  })
  return mapearUniforme(creado)
}

export async function editarUniforme(id: number, datos: DatosUniforme): Promise<UniformeInventario> {
  validarUniforme(datos)
  const actualizado = await pedir<UniformeInventarioApi>(`/m6/uniformes/${id}`, {
    metodo: 'PATCH',
    cuerpo: {
      referencia: normalizarReferencia(datos.referencia),
      tipo: datos.tipo,
      talla: datos.talla.trim().toUpperCase(),
      proveedorId: datos.proveedorId || null,
      costo: datos.costo,
      precioVenta: datos.precioVenta,
      cantidadDisponible: datos.cantidadDisponible,
      cantidadMinima: datos.cantidadMinima,
    },
  })
  return mapearUniforme(actualizado)
}

export async function cambiarEstadoUniforme(id: number, activo: boolean): Promise<UniformeInventario> {
  if (!activo) {
    const resultado = await pedir<UniformeInventarioApi>(`/m6/uniformes/${id}/desactivar`, {
      metodo: 'POST',
      cuerpo: { motivo: 'Desactivación realizada desde el inventario' },
    })
    return mapearUniforme(resultado)
  }
  const resultado = await pedir<UniformeInventarioApi>(`/m6/uniformes/${id}/reactivar`, {
    metodo: 'POST',
  })
  return mapearUniforme(resultado)
}

export async function crearProveedor(_datos: DatosProveedor): Promise<Proveedor> {
  return pedir<Proveedor>('/m6/proveedores', {
    metodo: 'POST',
    cuerpo: _datos,
  })
}

export async function cambiarEstadoProveedor(_id: number, _activo: boolean): Promise<Proveedor> {
  return pedir<Proveedor>(`/m6/proveedores/${_id}/estado`, {
    metodo: 'PATCH',
    cuerpo: { activo: _activo },
  })
}

export async function ajustarStock(
  id: number,
  cantidad: number,
  observacion: string,
): Promise<UniformeInventario> {
  if (!Number.isInteger(cantidad) || cantidad === 0) {
    throw new Error('El ajuste debe ser un número entero distinto de cero.')
  }
  const actualizado = await pedir<UniformeInventarioApi>(`/m6/uniformes/${id}/stock`, {
    metodo: 'PATCH',
    cuerpo: { cantidad, observacion },
  })
  return mapearUniforme(actualizado)
}
