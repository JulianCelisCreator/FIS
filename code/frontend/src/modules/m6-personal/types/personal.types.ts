// Contratos del registro de personal (HU-6.2 / RF-M6-02), iguales a los de la
// API GET/POST/PATCH /m6/personal.

export type TipoDocumento = 'CC' | 'CE' | 'PASAPORTE' | 'OTRO'
export type Cargo = 'PROFESOR' | 'CONTADOR' | 'FISIOTERAPEUTA' | 'ADMINISTRATIVO'
export type EstadoPersonal = 'ACTIVO' | 'INACTIVO'

export const TIPOS_DOCUMENTO: { valor: TipoDocumento; texto: string }[] = [
  { valor: 'CC', texto: 'Cédula de ciudadanía' },
  { valor: 'CE', texto: 'Cédula de extranjería' },
  { valor: 'PASAPORTE', texto: 'Pasaporte' },
  { valor: 'OTRO', texto: 'Otro' },
]

export const CARGOS: { valor: Cargo; texto: string }[] = [
  { valor: 'PROFESOR', texto: 'Profesor' },
  { valor: 'CONTADOR', texto: 'Contador' },
  { valor: 'FISIOTERAPEUTA', texto: 'Fisioterapeuta' },
  { valor: 'ADMINISTRATIVO', texto: 'Administrativo' },
]

export const PERMISOS_PERSONAL = {
  personalGestionar: 'M6_PERSONAL_GESTIONAR',
} as const

/** Cuenta de M1 vinculada a la ficha laboral. */
export interface CuentaPersonal {
  id: number
  correo: string
  estado: string
  roles: string[]
}

export interface Personal {
  id: number
  tipoDocumento: TipoDocumento
  numeroDocumento: string
  nombres: string
  apellidos: string
  correo: string
  telefono: string
  cargo: Cargo
  estado: EstadoPersonal
  fechaIngreso: string
  fechaRetiro: string | null
  cuenta: CuentaPersonal | null
}

export interface PaginaPersonal {
  datos: Personal[]
  total: number
  pagina: number
  tamano: number
}

export interface FiltrosPersonal {
  buscar?: string
  estado?: EstadoPersonal | ''
  pagina?: number
}

export interface DatosPersonal {
  tipoDocumento: TipoDocumento
  numeroDocumento: string
  nombres: string
  apellidos: string
  correo: string
  telefono: string
  cargo: Cargo
  usuarioId: number | null
}

/** Cuenta de M1 sin ficha laboral que se puede vincular. */
export interface CuentaDisponible {
  id: number
  nombre: string
  correo: string
  estado: string
  roles: string[]
}

export function textoCargo(cargo: Cargo): string {
  return CARGOS.find((opcion) => opcion.valor === cargo)?.texto ?? cargo
}

export function nombreCompleto(persona: Pick<Personal, 'nombres' | 'apellidos'>): string {
  return `${persona.nombres} ${persona.apellidos}`
}

/**
 * Valida en el cliente los campos obligatorios y su formato (el servidor vuelve
 * a validarlos). Devuelve el mensaje por campo; vacío si todo está bien.
 */
export function validarDatosPersonal(datos: DatosPersonal): Partial<Record<keyof DatosPersonal, string>> {
  const errores: Partial<Record<keyof DatosPersonal, string>> = {}
  if (!/^[A-Za-z0-9-]{3,20}$/.test(datos.numeroDocumento.trim())) {
    errores.numeroDocumento = 'Escribe el número de documento (3 a 20 letras, números o guiones).'
  }
  if (!datos.nombres.trim()) errores.nombres = 'Escribe los nombres.'
  if (!datos.apellidos.trim()) errores.apellidos = 'Escribe los apellidos.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(datos.correo.trim())) errores.correo = 'Escribe un correo válido.'
  if (!/^\+?[0-9 ]{7,20}$/.test(datos.telefono.trim())) errores.telefono = 'Escribe un teléfono de 7 a 20 dígitos.'
  return errores
}
