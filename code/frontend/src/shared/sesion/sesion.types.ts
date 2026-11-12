export type Rol =
  | 'ADMINISTRADOR'
  | 'PROFESOR'
  | 'PATINADOR'
  | 'ACUDIENTE'
  | 'CONTADOR'
  | 'FISIOTERAPEUTA'
  | 'VISITANTE'

/** Usuario de la sesión actual (GET /sesion y POST /m1/acceso/ingreso), con sus roles y permisos. */
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
  /** Guarda la sesión que devolvió el ingreso (HU-M1-02). */
  establecerSesion: (sesion: Sesion) => void
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
