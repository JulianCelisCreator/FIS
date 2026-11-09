import { pedir } from '../../../shared/services/cliente-api.ts'
import type { CuentaRegistrada, DatosRegistro } from '../types/acceso.types.ts'

/** RF-M1-01: crear una cuenta propia. */
export function registrarCuenta(datos: DatosRegistro): Promise<CuentaRegistrada> {
  return pedir<CuentaRegistrada>('/m1/acceso/registro', { metodo: 'POST', cuerpo: datos })
}
