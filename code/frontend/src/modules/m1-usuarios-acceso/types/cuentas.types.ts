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
