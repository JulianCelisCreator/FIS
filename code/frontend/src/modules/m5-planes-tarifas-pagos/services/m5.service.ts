import { pedir } from '../../../shared/services/cliente-api.ts'
import type {
  CobroPendiente,
  DatosTransaccion,
  PatinadorM5,
  PlanAdministrado,
  PlanDelPatinador,
  PlanDetalle,
  PlanOfertado,
  ResultadoAsignacion,
  ResultadoCambio,
  ResultadoMatricula,
  ResultadoPagoCobro,
  ResultadoPagoSesion,
  TipoPlan,
} from '../types/m5.types.ts'

// --- Planes y tarifas (RF-M5-01 a RF-M5-05) ---

export function listarPlanes(filtros: { tipo?: TipoPlan; estado?: 'ACTIVO' | 'INACTIVO'; buscar?: string } = {}): Promise<PlanAdministrado[]> {
  return pedir('/m5/planes', { consulta: filtros })
}

export function detallePlan(planId: number): Promise<PlanDetalle> {
  return pedir(`/m5/planes/${planId}`)
}

export function crearPlan(datos: {
  nombre: string
  tipo: TipoPlan
  diaLimitePago?: number
  descripcion?: string
}): Promise<PlanDetalle> {
  return pedir('/m5/planes', { metodo: 'POST', cuerpo: datos })
}

export function editarPlan(
  planId: number,
  cambios: { nombre?: string; diaLimitePago?: number; descripcion?: string },
): Promise<PlanDetalle> {
  return pedir(`/m5/planes/${planId}`, { metodo: 'PATCH', cuerpo: cambios })
}

export function desactivarPlan(planId: number, motivo?: string): Promise<PlanDetalle> {
  return pedir(`/m5/planes/${planId}/desactivar`, { metodo: 'POST', cuerpo: { motivo } })
}

export function registrarTarifa(planId: number, datos: { valor: number; vigenteDesde: string }): Promise<PlanDetalle> {
  return pedir(`/m5/planes/${planId}/tarifas`, { metodo: 'POST', cuerpo: datos })
}

// --- Asignación, cobros y pagos ---

export function buscarPatinadores(texto?: string, patinadorId?: number): Promise<PatinadorM5[]> {
  return pedir('/m5/patinadores', {
    consulta: { buscar: texto, patinadorId: patinadorId === undefined ? undefined : String(patinadorId) },
  })
}

/**
 * Planes para elegir al asignar o cambiar. El Administrador ve también los
 * inactivos o sin tarifa (deshabilitados); los demás, solo la oferta.
 */
export async function planesParaElegir(esAdministrador: boolean): Promise<PlanOfertado[]> {
  if (esAdministrador) {
    const planes = await pedir<PlanAdministrado[]>('/m5/planes')
    return planes.map((plan) => ({ ...plan, tarifa: plan.tarifaVigente }))
  }
  const oferta = await pedir<{ planes: Omit<PlanOfertado, 'asignable'>[] }>('/m5/planes/oferta')
  return oferta.planes.map((plan) => ({ ...plan, asignable: true }))
}

export function planDelPatinador(patinadorId: number): Promise<PlanDelPatinador> {
  return pedir(`/m5/patinadores/${patinadorId}/plan`)
}

export function asignarPlan(datos: { patinadorId: number; planId: number; fechaInicio: string }): Promise<ResultadoAsignacion> {
  return pedir('/m5/asignaciones', { metodo: 'POST', cuerpo: datos })
}

export function cambiarPlan(datos: { patinadorId: number; planId: number; motivo?: string }): Promise<ResultadoCambio> {
  return pedir('/m5/asignaciones/cambios', { metodo: 'POST', cuerpo: datos })
}

export async function cobrosPendientes(patinadorId: number): Promise<CobroPendiente[]> {
  const respuesta = await pedir<{ cobros: CobroPendiente[] }>(`/m5/patinadores/${patinadorId}/cobros-pendientes`)
  return respuesta.cobros
}

export function pagarCobro(datos: DatosTransaccion & { cobroId: number; monto: number }): Promise<ResultadoPagoCobro> {
  return pedir('/m5/pagos/cobro', { metodo: 'POST', cuerpo: datos })
}

export function pagarSesiones(
  datos: DatosTransaccion & { patinadorId: number; numeroSesiones: number },
): Promise<ResultadoPagoSesion> {
  return pedir('/m5/pagos/sesion', { metodo: 'POST', cuerpo: datos })
}

export function pagarMatricula(
  datos: DatosTransaccion & { patinadorId: number; valorMatricula: number; valorGastosAdministrativos: number },
): Promise<ResultadoMatricula> {
  return pedir('/m5/pagos/matricula', { metodo: 'POST', cuerpo: datos })
}
