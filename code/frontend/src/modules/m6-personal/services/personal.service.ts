// Registro de personal (HU-6.2). Con un usuario real del selector de prueba usa
// la API /m6/personal; con el usuario «Demo local» trabaja en memoria para poder
// presentar la pantalla sin base de datos (los cambios se pierden al recargar).

import { pedir, usandoDemoLocal } from '../../../shared/services/cliente-api.ts'
import { hoyEnClub } from '../../../shared/utils/formato.ts'
import type {
  CuentaDisponible,
  DatosPersonal,
  FiltrosPersonal,
  PaginaPersonal,
  Personal,
} from '../types/personal.types.ts'

const TAMANO_PAGINA = 20

export { usandoDemoLocal }

// ---------------------------------------------------------------- API real

function listarApi(filtros: FiltrosPersonal): Promise<PaginaPersonal> {
  return pedir<PaginaPersonal>('/m6/personal', {
    consulta: {
      buscar: filtros.buscar?.trim() || undefined,
      estado: filtros.estado || undefined,
      pagina: String(filtros.pagina ?? 1),
      tamano: String(TAMANO_PAGINA),
    },
  })
}

// ---------------------------------------------------------- Demostración local

const cuentasDemo: CuentaDisponible[] = [
  { id: 2, nombre: 'Carlos Ramírez', correo: 'contador@m6.local', estado: 'ACTIVA', roles: ['CONTADOR'] },
  { id: 31, nombre: 'Laura Méndez', correo: 'laura.mendez@escuela.test', estado: 'ACTIVA', roles: ['PROFESOR'] },
]

let siguienteId = 4
let personalDemo: Personal[] = [
  {
    id: 1, tipoDocumento: 'CC', numeroDocumento: '1012345678', nombres: 'Carlos', apellidos: 'Ramírez',
    correo: 'contador@m6.local', telefono: '3105550001', cargo: 'CONTADOR', estado: 'ACTIVO',
    fechaIngreso: '2026-02-01', fechaRetiro: null,
    cuenta: { id: 2, correo: 'contador@m6.local', estado: 'ACTIVA', roles: ['CONTADOR'] },
  },
  {
    id: 2, tipoDocumento: 'CC', numeroDocumento: '52345678', nombres: 'Diana', apellidos: 'Suárez',
    correo: 'diana.suarez@escuela.test', telefono: '3205550002', cargo: 'PROFESOR', estado: 'ACTIVO',
    fechaIngreso: '2025-08-15', fechaRetiro: null, cuenta: null,
  },
  {
    id: 3, tipoDocumento: 'CE', numeroDocumento: 'E-889911', nombres: 'Mateo', apellidos: 'Rincón',
    correo: 'mateo.rincon@escuela.test', telefono: '3005550003', cargo: 'FISIOTERAPEUTA', estado: 'INACTIVO',
    fechaIngreso: '2025-01-10', fechaRetiro: '2026-06-30', cuenta: null,
  },
]

const copia = (persona: Personal): Personal => ({ ...persona, cuenta: persona.cuenta && { ...persona.cuenta } })

function normalizar(datos: DatosPersonal): DatosPersonal {
  return {
    ...datos,
    numeroDocumento: datos.numeroDocumento.trim().toUpperCase(),
    nombres: datos.nombres.trim().replace(/\s+/g, ' '),
    apellidos: datos.apellidos.trim().replace(/\s+/g, ' '),
    correo: datos.correo.trim().toLowerCase(),
    telefono: datos.telefono.replace(/\s+/g, ''),
  }
}

function validarUnicosDemo(datos: DatosPersonal, id: number | null): void {
  const otros = personalDemo.filter((persona) => persona.id !== id)
  if (otros.some((p) => p.tipoDocumento === datos.tipoDocumento && p.numeroDocumento === datos.numeroDocumento)) {
    throw new Error('Ya existe una persona registrada con ese tipo y número de documento')
  }
  if (otros.some((p) => p.correo === datos.correo)) {
    throw new Error('Ya existe una persona registrada con ese correo')
  }
  if (datos.usuarioId && otros.some((p) => p.cuenta?.id === datos.usuarioId)) {
    throw new Error('Esa cuenta ya está vinculada a otra persona del personal')
  }
}

function cuentaDemo(usuarioId: number | null, actual: Personal['cuenta'] = null): Personal['cuenta'] {
  if (!usuarioId) return null
  if (actual?.id === usuarioId) return actual
  const cuenta = cuentasDemo.find((item) => item.id === usuarioId)
  if (!cuenta) throw new Error('La cuenta de usuario no existe')
  return { id: cuenta.id, correo: cuenta.correo, estado: cuenta.estado, roles: [...cuenta.roles] }
}

function buscarDemo(id: number): Personal {
  const persona = personalDemo.find((item) => item.id === id)
  if (!persona) throw new Error('La persona no existe en el registro de personal')
  return persona
}

// ---------------------------------------------------------------- Servicio

export async function listarPersonal(filtros: FiltrosPersonal = {}): Promise<PaginaPersonal> {
  if (!usandoDemoLocal()) return listarApi(filtros)
  const texto = filtros.buscar?.trim().toLowerCase() ?? ''
  const filtrados = personalDemo
    .filter((p) => !filtros.estado || p.estado === filtros.estado)
    .filter((p) => !texto || p.numeroDocumento.toLowerCase().includes(texto)
      || `${p.nombres} ${p.apellidos}`.toLowerCase().includes(texto))
    .sort((a, b) => a.estado.localeCompare(b.estado) || a.apellidos.localeCompare(b.apellidos))
  const pagina = filtros.pagina ?? 1
  return {
    datos: filtrados.slice((pagina - 1) * TAMANO_PAGINA, pagina * TAMANO_PAGINA).map(copia),
    total: filtrados.length,
    pagina,
    tamano: TAMANO_PAGINA,
  }
}

export async function cuentasDisponibles(buscar: string): Promise<CuentaDisponible[]> {
  if (!usandoDemoLocal()) {
    return pedir<CuentaDisponible[]>('/m6/personal/cuentas-disponibles', { consulta: { buscar: buscar.trim() } })
  }
  const texto = buscar.trim().toLowerCase()
  return cuentasDemo
    .filter((cuenta) => !personalDemo.some((p) => p.cuenta?.id === cuenta.id))
    .filter((cuenta) => !texto || cuenta.correo.includes(texto) || cuenta.nombre.toLowerCase().includes(texto))
    .map((cuenta) => ({ ...cuenta, roles: [...cuenta.roles] }))
}

export async function crearPersonal(datos: DatosPersonal): Promise<Personal> {
  if (!usandoDemoLocal()) return pedir<Personal>('/m6/personal', { metodo: 'POST', cuerpo: datos })
  const limpio = normalizar(datos)
  validarUnicosDemo(limpio, null)
  const { usuarioId, ...resto } = limpio
  const persona: Personal = {
    ...resto, id: siguienteId++, estado: 'ACTIVO', fechaIngreso: hoyEnClub(), fechaRetiro: null,
    cuenta: cuentaDemo(usuarioId),
  }
  personalDemo = [...personalDemo, persona]
  return copia(persona)
}

export async function editarPersonal(id: number, datos: DatosPersonal): Promise<Personal> {
  if (!usandoDemoLocal()) return pedir<Personal>(`/m6/personal/${id}`, { metodo: 'PATCH', cuerpo: datos })
  const actual = buscarDemo(id)
  const limpio = normalizar(datos)
  validarUnicosDemo(limpio, id)
  const { usuarioId, ...resto } = limpio
  const editado: Personal = { ...actual, ...resto, cuenta: cuentaDemo(usuarioId, actual.cuenta) }
  personalDemo = personalDemo.map((persona) => (persona.id === id ? editado : persona))
  return copia(editado)
}

export async function desactivarPersonal(id: number, motivo: string): Promise<Personal> {
  if (!usandoDemoLocal()) {
    return pedir<Personal>(`/m6/personal/${id}/desactivar`, { metodo: 'POST', cuerpo: { motivo: motivo.trim() || undefined } })
  }
  const actual = buscarDemo(id)
  if (actual.estado === 'INACTIVO') throw new Error('La persona ya está inactiva')
  // Igual que la API: el personal inactivo pierde el rol Contador.
  const cuenta = actual.cuenta && { ...actual.cuenta, roles: actual.cuenta.roles.filter((rol) => rol !== 'CONTADOR') }
  const editado: Personal = { ...actual, estado: 'INACTIVO', fechaRetiro: hoyEnClub(), cuenta }
  personalDemo = personalDemo.map((persona) => (persona.id === id ? editado : persona))
  return copia(editado)
}

/** HU-6.3: asigna o retira el rol Contador de la cuenta vinculada. */
export async function cambiarRolContador(id: number, asignar: boolean): Promise<Personal> {
  if (!usandoDemoLocal()) {
    return pedir<Personal>(`/m6/personal/${id}/rol-contador${asignar ? '' : '/retirar'}`, { metodo: 'POST', cuerpo: {} })
  }
  const actual = buscarDemo(id)
  if (asignar) {
    if (actual.estado !== 'ACTIVO') throw new Error('Solo se puede asignar el rol Contador a personal activo')
    if (!actual.cuenta) throw new Error('La persona no tiene una cuenta de usuario vinculada; vincúlala antes de asignar el rol')
    if (actual.cuenta.roles.includes('CONTADOR')) throw new Error('La persona ya tiene el rol Contador')
  } else if (!actual.cuenta?.roles.includes('CONTADOR')) {
    throw new Error('La persona no tiene el rol Contador')
  }
  const roles = asignar
    ? [...(actual.cuenta?.roles ?? []), 'CONTADOR'].sort()
    : (actual.cuenta?.roles ?? []).filter((rol) => rol !== 'CONTADOR')
  const editado: Personal = { ...actual, cuenta: actual.cuenta && { ...actual.cuenta, roles } }
  personalDemo = personalDemo.map((persona) => (persona.id === id ? editado : persona))
  return copia(editado)
}

export async function reactivarPersonal(id: number): Promise<Personal> {
  if (!usandoDemoLocal()) return pedir<Personal>(`/m6/personal/${id}/reactivar`, { metodo: 'POST', cuerpo: {} })
  const actual = buscarDemo(id)
  if (actual.estado === 'ACTIVO') throw new Error('La persona ya está activa')
  const editado: Personal = { ...actual, estado: 'ACTIVO', fechaRetiro: null }
  personalDemo = personalDemo.map((persona) => (persona.id === id ? editado : persona))
  return copia(editado)
}
