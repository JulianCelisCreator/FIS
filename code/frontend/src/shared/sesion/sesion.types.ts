export type Rol =
  | 'ADMINISTRADOR'
  | 'PROFESOR'
  | 'PATINADOR'
  | 'ACUDIENTE'
  | 'CONTADOR'
  | 'FISIOTERAPEUTA'
  | 'VISITANTE'

/** Usuario actual (GET /sesion). */
export interface Sesion {
  id: number
  nombre: string
  roles: Rol[]
  permisos: string[]
}

/** Usuario elegible en el selector de prueba (GET /sesion/usuarios). */
export interface UsuarioPrueba {
  id: number
  nombre: string
  correo: string
  roles: Rol[]
}

export interface ContextoSesion {
  sesion: Sesion | null
  usuarios: UsuarioPrueba[]
  cargando: boolean
  error: string | null
  cambiarUsuario: (id: number | null) => void
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
