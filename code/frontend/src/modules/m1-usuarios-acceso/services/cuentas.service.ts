import { pedir } from '../../../shared/services/cliente-api.ts'
import type { CuentaCreada, CuentaListada, DatosCuenta, FiltrosCuentas, PaginaCuentas } from '../types/cuentas.types.ts'

export const TAMANO_PAGINA = 20

/** HU-M1-01: el Administrador crea una cuenta con su rol. */
export function crearCuenta(datos: DatosCuenta): Promise<CuentaCreada> {
  return pedir<CuentaCreada>('/m1/cuentas', { metodo: 'POST', cuerpo: datos })
}

/** HU-M1-05 CA-01: listado filtrado y paginado en el servidor. */
export function listarCuentas(filtros: FiltrosCuentas): Promise<PaginaCuentas> {
  return pedir<PaginaCuentas>('/m1/cuentas', {
    consulta: {
      buscar: filtros.buscar,
      rol: filtros.rol,
      estado: filtros.estado,
      pagina: String(filtros.pagina),
      tamano: String(TAMANO_PAGINA),
    },
  })
}

/** HU-M1-05 CA-03: desactivar una cuenta (nunca eliminarla). */
export function desactivarCuenta(usuarioId: number): Promise<CuentaListada> {
  return pedir<CuentaListada>(`/m1/cuentas/${usuarioId}/desactivar`, { metodo: 'POST' })
}

/** HU-M1-05 CA-04: reactivar una cuenta desactivada; vuelve a su estado anterior. */
export function reactivarCuenta(usuarioId: number): Promise<CuentaListada> {
  return pedir<CuentaListada>(`/m1/cuentas/${usuarioId}/reactivar`, { metodo: 'POST' })
}
