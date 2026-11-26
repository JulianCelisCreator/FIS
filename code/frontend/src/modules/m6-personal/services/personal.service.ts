// Registro de personal (HU-6.2) y rol Contador (HU-6.3) contra la API
// /m6/personal. La sesión viaja en la cookie de M1 (HU-M1-02).

import { pedir } from '../../../shared/services/cliente-api.ts'
import type {
  CuentaDisponible,
  DatosPersonal,
  FiltrosPersonal,
  PaginaPersonal,
  Personal,
} from '../types/personal.types.ts'

const TAMANO_PAGINA = 20

export function listarPersonal(filtros: FiltrosPersonal = {}): Promise<PaginaPersonal> {
  return pedir<PaginaPersonal>('/m6/personal', {
    consulta: {
      buscar: filtros.buscar?.trim() || undefined,
      estado: filtros.estado || undefined,
      cargo: filtros.cargo || undefined,
      pagina: String(filtros.pagina ?? 1),
      tamano: String(TAMANO_PAGINA),
    },
  })
}

export function cuentasDisponibles(buscar: string): Promise<CuentaDisponible[]> {
  return pedir<CuentaDisponible[]>('/m6/personal/cuentas-disponibles', { consulta: { buscar: buscar.trim() } })
}

export function crearPersonal(datos: DatosPersonal): Promise<Personal> {
  return pedir<Personal>('/m6/personal', { metodo: 'POST', cuerpo: datos })
}

export function editarPersonal(id: number, datos: DatosPersonal): Promise<Personal> {
  return pedir<Personal>(`/m6/personal/${id}`, { metodo: 'PATCH', cuerpo: datos })
}

/** Desactivar retira también el rol Contador de la cuenta vinculada. */
export function desactivarPersonal(id: number, motivo: string): Promise<Personal> {
  return pedir<Personal>(`/m6/personal/${id}/desactivar`, { metodo: 'POST', cuerpo: { motivo: motivo.trim() || undefined } })
}

/** HU-6.3: asigna o retira el rol Contador de la cuenta vinculada. */
export function cambiarRolContador(id: number, asignar: boolean): Promise<Personal> {
  return pedir<Personal>(`/m6/personal/${id}/rol-contador${asignar ? '' : '/retirar'}`, { metodo: 'POST', cuerpo: {} })
}

export function reactivarPersonal(id: number): Promise<Personal> {
  return pedir<Personal>(`/m6/personal/${id}/reactivar`, { metodo: 'POST', cuerpo: {} })
}
