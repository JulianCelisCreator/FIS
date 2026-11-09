import type { Rol } from '../../../shared/sesion/sesion.types.ts'

/** Roles con los que una persona puede crear su propia cuenta (RF-M1-01). */
export type RolAutorregistro = Extract<Rol, 'PATINADOR' | 'ACUDIENTE' | 'PROFESOR' | 'VISITANTE'>

export const ROLES_AUTORREGISTRO: { rol: RolAutorregistro; texto: string }[] = [
  { rol: 'PATINADOR', texto: 'Patinador' },
  { rol: 'ACUDIENTE', texto: 'Acudiente' },
  { rol: 'PROFESOR', texto: 'Profesor' },
  { rol: 'VISITANTE', texto: 'Visitante' },
]

/** Cuerpo de POST /m1/acceso/registro. */
export interface DatosRegistro {
  nombres: string
  apellidos: string
  correo: string
  contrasena: string
  rol: RolAutorregistro
}

/** Respuesta de POST /m1/acceso/registro. */
export interface CuentaRegistrada {
  id: number
  nombre: string
  correo: string
  rol: RolAutorregistro
  estado: 'POR_REGISTRAR' | 'ACTIVA' | 'DESACTIVADA'
  correoVerificado: boolean
}
