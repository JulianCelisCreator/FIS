import { pedir } from '../../../shared/services/cliente-api.ts'
import type { CuentaCreada, DatosCuenta } from '../types/cuentas.types.ts'

/** HU-M1-01: el Administrador crea una cuenta con su rol. */
export function crearCuenta(datos: DatosCuenta): Promise<CuentaCreada> {
  return pedir<CuentaCreada>('/m1/cuentas', { metodo: 'POST', cuerpo: datos })
}
