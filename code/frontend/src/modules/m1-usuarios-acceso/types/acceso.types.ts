import type { Rol } from '../../../shared/sesion/sesion.types.ts'

/** Roles con los que una persona puede crear su propia cuenta (RF-M1-01). */
export type RolAutorregistro = Extract<Rol, 'PATINADOR' | 'ACUDIENTE' | 'PROFESOR' | 'VISITANTE'>

export const ROLES_AUTORREGISTRO: { rol: RolAutorregistro; texto: string }[] = [
  { rol: 'PATINADOR', texto: 'Patinador' },
  { rol: 'ACUDIENTE', texto: 'Acudiente' },
  { rol: 'PROFESOR', texto: 'Profesor' },
  { rol: 'VISITANTE', texto: 'Visitante' },
]

/**
 * Roles para el campo «Soy» del ingreso (RF-M1-02). Primero los de autorregistro,
 * como en el wireframe W01; después el personal, que también ingresa por aquí.
 */
export const ROLES_INGRESO: { rol: Rol; texto: string }[] = [
  ...ROLES_AUTORREGISTRO,
  { rol: 'ADMINISTRADOR', texto: 'Administrador' },
  { rol: 'CONTADOR', texto: 'Contador' },
  { rol: 'FISIOTERAPEUTA', texto: 'Fisioterapeuta' },
]

/** Cuerpo de POST /m1/acceso/ingreso. */
export interface DatosIngreso {
  correo: string
  contrasena: string
  rol: Rol
}

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
