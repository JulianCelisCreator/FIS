export type Rol =
  | 'ADMINISTRADOR'
  | 'PROFESOR'
  | 'PATINADOR'
  | 'ACUDIENTE'
  | 'CONTADOR'
  | 'FISIOTERAPEUTA'
  | 'VISITANTE'

/** Usuario de la sesión actual (GET /sesion y POST /m1/acceso/ingreso). Lleva solo el rol con el que ingresó. */
export interface Sesion {
  id: number
  nombre: string
  roles: Rol[]
  permisos: string[]
}

export interface ContextoSesion {
  sesion: Sesion | null
  /** true mientras se consulta si hay una sesión abierta. */
  cargando: boolean
  error: string | null
  /** Guarda la sesión que devolvió el ingreso, o null al cerrar sesión. */
  establecerSesion: (sesion: Sesion | null) => void
  tienePermiso: (permiso: string) => boolean
  tieneRol: (rol: Rol) => boolean
}

export const NOMBRE_ROL: Record<Rol, string> = {
  ADMINISTRADOR: 'Administrador',
  PROFESOR: 'Profesor',
  PATINADOR: 'Patinador',
  ACUDIENTE: 'Acudiente',
  CONTADOR: 'Contador',
  FISIOTERAPEUTA: 'Fisioterapeuta',
  VISITANTE: 'Visitante',
}
