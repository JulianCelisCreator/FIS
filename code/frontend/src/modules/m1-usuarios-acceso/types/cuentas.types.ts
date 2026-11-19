import type { Rol } from '../../../shared/sesion/sesion.types.ts'

/** Roles que el Administrador asigna al crear una cuenta (HU-M1-01). */
export type RolCuenta = Extract<Rol, 'PROFESOR' | 'PATINADOR' | 'ACUDIENTE' | 'CONTADOR' | 'FISIOTERAPEUTA'>

export const ROLES_CUENTA: { rol: RolCuenta; texto: string }[] = [
  { rol: 'PROFESOR', texto: 'Profesor' },
  { rol: 'PATINADOR', texto: 'Patinador' },
  { rol: 'ACUDIENTE', texto: 'Acudiente' },
  { rol: 'CONTADOR', texto: 'Contador' },
  { rol: 'FISIOTERAPEUTA', texto: 'Fisioterapeuta' },
]

export type EstadoCuenta = 'POR_REGISTRAR' | 'ACTIVA' | 'DESACTIVADA'

/** Estado para la insignia del catálogo (entidad «cuenta»). */
export const ESTADO_INSIGNIA: Record<EstadoCuenta, string> = {
  POR_REGISTRAR: 'por-registrar',
  ACTIVA: 'activa',
  DESACTIVADA: 'desactivada',
}

export const ESTADOS_CUENTA: { estado: EstadoCuenta; texto: string }[] = [
  { estado: 'ACTIVA', texto: 'Activa' },
  { estado: 'POR_REGISTRAR', texto: 'Por registrar' },
  { estado: 'DESACTIVADA', texto: 'Desactivada' },
]

/** Fila del listado «Usuarios» (GET /m1/cuentas, HU-M1-05). */
export interface CuentaListada {
  id: number
  nombre: string
  correo: string
  roles: Rol[]
  estado: EstadoCuenta
  ultimoIngresoEn: string | null
}

export interface PaginaCuentas {
  cuentas: CuentaListada[]
  total: number
  pagina: number
  tamano: number
}

export interface FiltrosCuentas {
  buscar?: string
  rol?: Rol
  estado?: EstadoCuenta
  pagina: number
}

/** Cuerpo de POST /m1/cuentas. */
export interface DatosCuenta {
  nombres: string
  apellidos: string
  correo: string
  rol: RolCuenta
}

/** Respuesta de POST /m1/cuentas. La contraseña temporal llega una sola vez. */
export interface CuentaCreada {
  id: number
  nombre: string
  correo: string
  rol: RolCuenta
  estado: 'POR_REGISTRAR'
  contrasenaTemporal: string
}
