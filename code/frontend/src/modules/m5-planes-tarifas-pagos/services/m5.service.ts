import { hoyEnClub } from '../../../shared/utils/formato.ts'
import type {
  CobroPendiente,
  DatosTransaccion,
  PatinadorM5,
  PagoDemo,
  PlanAdministrado,
  PlanDelPatinador,
  PlanDetalle,
  PlanOfertado,
  TarifaEnHistorial,
  ResultadoAsignacion,
  ResultadoCambio,
  ResultadoMatricula,
  ResultadoPagoCobro,
  ResultadoPagoSesion,
  TipoPlan,
} from '../types/m5.types.ts'
import {
  diaDelMes,
  diasCobradosPrimerMes,
  primerDiaMesSiguiente,
  valorPrimeraMensualidad,
} from '../utils/estimacion-cobros.ts'
import { erroresTransaccion } from '../utils/validar-transaccion.ts'

// Estado de demostración en memoria; no consulta ni modifica la base compartida.

let PLANES_DEMO: PlanAdministrado[] = [
  { id: 1, nombre: 'Inicial', tipo: 'TRES_DIAS', periodicidad: 'MENSUAL', diasPorSemana: 3, incluyeGimnasio: false, diaLimitePago: 5, descripcion: 'Plan para iniciación y práctica de patinaje.', estado: 'ACTIVO', tarifaVigente: { valor: 180000, vigenteDesde: '2026-01-01' }, tarifaProgramada: null, patinadores: 4, asignable: true, ultimaModificacion: { por: 'Demostración M5', en: '2026-11-09T12:00:00' } },
  { id: 2, nombre: 'Competitivo', tipo: 'SEIS_DIAS', periodicidad: 'MENSUAL', diasPorSemana: 6, incluyeGimnasio: false, diaLimitePago: 10, descripcion: 'Plan intensivo para entrenamiento competitivo.', estado: 'ACTIVO', tarifaVigente: { valor: 320000, vigenteDesde: '2026-01-01' }, tarifaProgramada: null, patinadores: 3, asignable: true, ultimaModificacion: { por: 'Demostración M5', en: '2026-11-09T12:00:00' } },
  { id: 3, nombre: 'Competitivo Plus', tipo: 'SEIS_DIAS_GIMNASIO', periodicidad: 'MENSUAL', diasPorSemana: 6, incluyeGimnasio: true, diaLimitePago: 15, descripcion: 'Entrenamiento en pista y preparación física de gimnasio.', estado: 'ACTIVO', tarifaVigente: { valor: 420000, vigenteDesde: '2026-01-01' }, tarifaProgramada: null, patinadores: 2, asignable: true, ultimaModificacion: { por: 'Demostración M5', en: '2026-11-09T12:00:00' } },
  { id: 4, nombre: 'Sesión libre', tipo: 'DIA_UNICO', periodicidad: 'POR_SESION', diasPorSemana: 1, incluyeGimnasio: false, diaLimitePago: null, descripcion: 'Pago por una sesión individual.', estado: 'ACTIVO', tarifaVigente: { valor: 35000, vigenteDesde: '2026-01-01' }, tarifaProgramada: null, patinadores: 1, asignable: true, ultimaModificacion: { por: 'Demostración M5', en: '2026-11-09T12:00:00' } },
]

let PATINADORES_DEMO: PatinadorM5[] = [
  { id: 106, nombre: 'Diego Demo Pago', tipoDocumento: 'TI', numeroDocumento: 'DEMO-PAGO-106', edad: 13, esMenor: true, acudientes: [{ id: 206, nombre: 'Paula Demo', parentesco: 'Madre' }], planActual: { asignacionId: 306, planId: 1, nombre: 'Inicial', periodicidad: 'MENSUAL', diasPorSemana: 3, fechaInicio: '2026-11-01', fechaFin: null }, tieneCambioProgramado: false, matriculaPagada: true, estadoCartera: 'PENDIENTE' },
  { id: 101, nombre: 'Sofía Ramírez', tipoDocumento: 'CC', numeroDocumento: '1023456789', edad: 14, esMenor: true, acudientes: [{ id: 201, nombre: 'María Ramírez', parentesco: 'Madre' }], planActual: { asignacionId: 301, planId: 1, nombre: 'Inicial', periodicidad: 'MENSUAL', diasPorSemana: 3, fechaInicio: '2026-11-01', fechaFin: null }, tieneCambioProgramado: false, matriculaPagada: true, estadoCartera: 'VENCIDO' },
  { id: 102, nombre: 'Lucas Martínez', tipoDocumento: 'TI', numeroDocumento: '1045678901', edad: 11, esMenor: true, acudientes: [{ id: 202, nombre: 'Andrea Martínez', parentesco: 'Madre' }], planActual: { asignacionId: 302, planId: 2, nombre: 'Competitivo', periodicidad: 'MENSUAL', diasPorSemana: 6, fechaInicio: '2026-10-01', fechaFin: null }, tieneCambioProgramado: false, matriculaPagada: true, estadoCartera: 'PENDIENTE' },
  { id: 103, nombre: 'Valentina Torres', tipoDocumento: 'CC', numeroDocumento: '1098765432', edad: 16, esMenor: true, acudientes: [{ id: 203, nombre: 'Carlos Torres', parentesco: 'Padre' }], planActual: { asignacionId: 303, planId: 3, nombre: 'Competitivo Plus', periodicidad: 'MENSUAL', diasPorSemana: 6, fechaInicio: '2026-09-01', fechaFin: null }, tieneCambioProgramado: false, matriculaPagada: true, estadoCartera: 'VENCIDO' },
  { id: 104, nombre: 'Mateo Cárdenas', tipoDocumento: 'TI', numeroDocumento: '1034567890', edad: 12, esMenor: true, acudientes: [{ id: 204, nombre: 'Laura Cárdenas', parentesco: 'Madre' }], planActual: null, tieneCambioProgramado: false, matriculaPagada: false, estadoCartera: 'AL_DIA' },
  { id: 105, nombre: 'Samuel Rojas', tipoDocumento: 'CC', numeroDocumento: '1012345678', edad: 19, esMenor: false, acudientes: [], planActual: { asignacionId: 305, planId: 4, nombre: 'Sesión libre', periodicidad: 'POR_SESION', diasPorSemana: 1, fechaInicio: '2026-11-01', fechaFin: null }, tieneCambioProgramado: false, matriculaPagada: false, estadoCartera: 'AL_DIA' },
]

let siguientePlanId = Math.max(...PLANES_DEMO.map((plan) => plan.id)) + 1
let siguienteAsignacionId = 307
let siguienteCobroId = 505
let siguientePagoId = 2
let siguienteComprobanteId = 2
const COBROS_DEMO: (CobroPendiente & { patinadorId: number })[] = [
  { id: 500, patinadorId: 101, concepto: 'Mensualidad', periodo: '2026-11', descripcion: 'Plan Inicial · noviembre 2026', valor: 180000, pagado: 0, saldo: 180000, fechaLimite: '2026-11-05', vencidoDesde: '2026-11-06', vencido: true },
  { id: 504, patinadorId: 101, concepto: 'Préstamo de implemento', periodo: null, descripcion: 'Préstamo de casco · 1 unidad · 5 días', valor: 50000, pagado: 0, saldo: 50000, fechaLimite: '2026-11-13', vencidoDesde: '', vencido: false },
  { id: 503, patinadorId: 106, concepto: 'Mensualidad', periodo: hoyEnClub().slice(0, 7), descripcion: 'Plan Inicial · mensualidad de demostración', valor: 180000, pagado: 0, saldo: 180000, fechaLimite: diaDelMes(hoyEnClub(), 28), vencidoDesde: '', vencido: false },
  { id: 501, patinadorId: 102, concepto: 'Mensualidad', periodo: '2026-11', descripcion: 'Plan Competitivo · noviembre 2026', valor: 320000, pagado: 0, saldo: 320000, fechaLimite: '2026-11-10', vencidoDesde: '', vencido: false },
  { id: 502, patinadorId: 103, concepto: 'Mensualidad', periodo: '2026-11', descripcion: 'Plan Competitivo Plus · noviembre 2026', valor: 420000, pagado: 100000, saldo: 320000, fechaLimite: '2026-11-05', vencidoDesde: '2026-11-06', vencido: true },
]
const PAGOS_DEMO: PagoDemo[] = [{
  id: 1,
  patinadorId: 103,
  patinadorNombre: 'Valentina Torres',
  concepto: 'Abono de mensualidad · noviembre de 2026',
  monto: 100000,
  fechaPago: '2026-11-02',
  medioPago: 'EFECTIVO',
  referencia: '',
  comprobante: 'DEMO-000001',
  registradoPor: 'Demostración local',
}]
const TARIFAS_DEMO = new Map<number, TarifaEnHistorial[]>()

function clonarPlan(plan: PlanAdministrado): PlanAdministrado {
  const patinadores = PATINADORES_DEMO.filter((item) => item.planActual?.planId === plan.id).length
  return { ...plan, patinadores, tarifaVigente: plan.tarifaVigente ? { ...plan.tarifaVigente } : null }
}

function detallesPlan(plan: PlanAdministrado): PlanDetalle {
  let tarifas = TARIFAS_DEMO.get(plan.id)
  if (!tarifas) {
    tarifas = plan.tarifaVigente ? [{
      id: plan.id * 10,
      valor: plan.tarifaVigente.valor,
      vigenteDesde: plan.tarifaVigente.vigenteDesde,
      vigenteHasta: null,
      estado: 'VIGENTE',
      registradoPor: 'Demostración M5',
      registradoEn: '2026-11-01T12:00:00',
    }] : []
    TARIFAS_DEMO.set(plan.id, tarifas)
  }
  return { ...clonarPlan(plan), tarifas: tarifas.map((tarifa) => ({ ...tarifa })) }
}

function buscarPlan(planId: number): PlanAdministrado {
  const plan = PLANES_DEMO.find((item) => item.id === planId)
  if (!plan) throw new Error('No se encontró el plan.')
  return plan
}

function actualizarCartera(patinadorId: number): PatinadorM5['estadoCartera'] {
  const pendientes = COBROS_DEMO.filter((item) => item.patinadorId === patinadorId && item.saldo > 0)
  const estado = pendientes.some((item) => item.fechaLimite < hoyEnClub())
    ? 'VENCIDO'
    : pendientes.length > 0 ? 'PENDIENTE' : 'AL_DIA'
  const patinador = PATINADORES_DEMO.find((item) => item.id === patinadorId)
  if (patinador) patinador.estadoCartera = estado
  return estado
}

function crearResultadoPago(
  patinadorId: number,
  monto: number,
  transaccion: DatosTransaccion,
  concepto: string,
) {
  const estado = actualizarCartera(patinadorId)
  const pagoId = siguientePagoId++
  const comprobanteNumero = `DEMO-${String(siguienteComprobanteId++).padStart(6, '0')}`
  const patinador = PATINADORES_DEMO.find((item) => item.id === patinadorId)
  if (!patinador) throw new Error('No se encontró el patinador para guardar el pago.')
  PAGOS_DEMO.unshift({
    id: pagoId,
    patinadorId,
    patinadorNombre: patinador.nombre,
    concepto,
    monto,
    fechaPago: transaccion.fechaPago,
    medioPago: transaccion.medioPago,
    referencia: transaccion.referencia ?? '',
    comprobante: comprobanteNumero,
    registradoPor: 'Demostración local',
  })
  return {
    pagoId,
    patinadorId,
    comprobante: { id: siguienteComprobanteId - 1, numero: comprobanteNumero },
    estadoCartera: {
      estado,
      saldoPendiente: COBROS_DEMO
        .filter((item) => item.patinadorId === patinadorId && item.saldo > 0)
        .reduce((total, item) => total + item.saldo, 0),
    },
    monto,
  }
}

// --- Planes y tarifas (RF-M5-01 a RF-M5-05) ---

export function listarPlanes(filtros: { tipo?: TipoPlan; estado?: 'ACTIVO' | 'INACTIVO'; buscar?: string } = {}): Promise<PlanAdministrado[]> {
  return Promise.resolve(PLANES_DEMO
    .filter((plan) =>
      (!filtros.tipo || plan.tipo === filtros.tipo) &&
      (!filtros.estado || plan.estado === filtros.estado) &&
      (!filtros.buscar || plan.nombre.toLowerCase().includes(filtros.buscar.toLowerCase())),
    )
    .map(clonarPlan))
}

export async function detallePlan(planId: number): Promise<PlanDetalle> {
  return detallesPlan(buscarPlan(planId))
}

export async function crearPlan(datos: {
  nombre: string
  tipo: TipoPlan
  diaLimitePago?: number
  descripcion?: string
}): Promise<PlanDetalle> {
  const tipo = datos.tipo
  const plan: PlanAdministrado = {
    id: siguientePlanId++,
    nombre: datos.nombre,
    tipo,
    periodicidad: tipo === 'DIA_UNICO' ? 'POR_SESION' : 'MENSUAL',
    diasPorSemana: tipo === 'DIA_UNICO' ? 1 : tipo === 'TRES_DIAS' ? 3 : 6,
    incluyeGimnasio: tipo === 'SEIS_DIAS_GIMNASIO',
    diaLimitePago: tipo === 'DIA_UNICO' ? null : datos.diaLimitePago ?? 5,
    descripcion: datos.descripcion ?? null,
    estado: 'ACTIVO',
    tarifaVigente: null,
    tarifaProgramada: null,
    patinadores: 0,
    asignable: false,
    ultimaModificacion: { por: 'Demo local', en: new Date().toISOString() },
  }
  PLANES_DEMO = [...PLANES_DEMO, plan]
  return detallesPlan(plan)
}

export async function editarPlan(
  planId: number,
  cambios: { nombre?: string; diaLimitePago?: number; descripcion?: string },
): Promise<PlanDetalle> {
  const plan = buscarPlan(planId)
  Object.assign(plan, cambios, { ultimaModificacion: { por: 'Demo local', en: new Date().toISOString() } })
  return detallesPlan(plan)
}

export async function desactivarPlan(planId: number, _motivo?: string): Promise<PlanDetalle> {
  const plan = buscarPlan(planId)
  plan.estado = 'INACTIVO'
  plan.asignable = false
  plan.ultimaModificacion = { por: 'Demo local', en: new Date().toISOString() }
  return detallesPlan(plan)
}

export function registrarTarifa(planId: number, datos: { valor: number; vigenteDesde: string }): Promise<PlanDetalle> {
  const plan = buscarPlan(planId)
  const tarifas = TARIFAS_DEMO.get(planId) ?? []
  for (const tarifa of tarifas) {
    if (tarifa.estado === 'VIGENTE') {
      tarifa.estado = datos.vigenteDesde > hoyEnClub() ? 'VIGENTE' : 'HISTORICA'
      tarifa.vigenteHasta = datos.vigenteDesde > hoyEnClub() ? datos.vigenteDesde : hoyEnClub()
    }
  }
  const tarifa: TarifaEnHistorial = {
    id: siguientePlanId * 100 + tarifas.length,
    valor: datos.valor,
    vigenteDesde: datos.vigenteDesde,
    vigenteHasta: null,
    estado: datos.vigenteDesde > hoyEnClub() ? 'PROGRAMADA' : 'VIGENTE',
    registradoPor: 'Demo local',
    registradoEn: new Date().toISOString(),
  }
  tarifas.push(tarifa)
  TARIFAS_DEMO.set(planId, tarifas)
  if (tarifa.estado === 'VIGENTE') plan.tarifaVigente = { valor: datos.valor, vigenteDesde: datos.vigenteDesde }
  else plan.tarifaProgramada = { valor: datos.valor, vigenteDesde: datos.vigenteDesde }
  plan.asignable = plan.estado === 'ACTIVO'
  plan.ultimaModificacion = { por: 'Demo local', en: new Date().toISOString() }
  return Promise.resolve(detallesPlan(plan))
}

// --- Asignación, cobros y pagos ---

export function buscarPatinadores(texto?: string, patinadorId?: number): Promise<PatinadorM5[]> {
  return Promise.resolve(PATINADORES_DEMO.filter((patinador) =>
    (!patinadorId || patinador.id === patinadorId) &&
    (!texto || patinador.nombre.toLowerCase().includes(texto.toLowerCase())),
  ).map((patinador) => ({
    ...patinador,
    estadoCartera: actualizarCartera(patinador.id),
    acudientes: [...patinador.acudientes],
    planActual: patinador.planActual ? { ...patinador.planActual } : null,
  })))
}

/**
 * Planes para elegir al asignar o cambiar. El Administrador ve también los
 * inactivos o sin tarifa (deshabilitados); los demás, solo la oferta.
 */
export async function planesParaElegir(esAdministrador: boolean): Promise<PlanOfertado[]> {
  return PLANES_DEMO
    .filter((plan) => esAdministrador || plan.estado === 'ACTIVO')
    .map((plan) => ({
      id: plan.id,
      nombre: plan.nombre,
      tipo: plan.tipo,
      periodicidad: plan.periodicidad,
      diasPorSemana: plan.diasPorSemana,
      incluyeGimnasio: plan.incluyeGimnasio,
      diaLimitePago: plan.diaLimitePago,
      descripcion: plan.descripcion,
      tarifa: plan.tarifaVigente,
      asignable: plan.asignable && plan.estado === 'ACTIVO' && plan.tarifaVigente !== null,
    }))
}

export async function planDelPatinador(patinadorId: number): Promise<PlanDelPatinador> {
    const patinador = PATINADORES_DEMO.find((item) => item.id === patinadorId)
    if (!patinador) throw new Error('No se encontró el patinador.')
    const actual = patinador.planActual
      ? {
          id: patinador.planActual.asignacionId,
          planId: patinador.planActual.planId,
          planNombre: patinador.planActual.nombre,
          periodicidad: patinador.planActual.periodicidad,
          diasPorSemana: patinador.planActual.diasPorSemana,
          fechaInicio: patinador.planActual.fechaInicio,
          fechaFin: patinador.planActual.fechaFin,
        }
      : null
    return { actual, programado: null, historial: actual ? [actual] : [] }
}

export function asignarPlan(datos: {
  patinadorId: number
  planId: number
  fechaInicio: string
  pagoInicial?: DatosTransaccion & { monto: number }
}): Promise<ResultadoAsignacion> {
  const patinador = PATINADORES_DEMO.find((item) => item.id === datos.patinadorId)
  const plan = buscarPlan(datos.planId)
  if (!patinador) throw new Error('No se encontró el patinador.')
  if (patinador.planActual) throw new Error('El patinador ya tiene un plan activo.')
  if (plan.estado !== 'ACTIVO' || !plan.tarifaVigente) throw new Error('El plan no tiene una tarifa vigente.')
  if (datos.pagoInicial && plan.periodicidad !== 'MENSUAL') {
    throw new Error('El pago inicial solo aplica a planes mensuales.')
  }
  const valorPrimerCobro = plan.periodicidad === 'MENSUAL'
    ? valorPrimeraMensualidad(plan.tarifaVigente.valor, datos.fechaInicio)
    : null
  if (datos.pagoInicial && (
    !Number.isSafeInteger(datos.pagoInicial.monto) ||
    datos.pagoInicial.monto <= 0 ||
    datos.pagoInicial.monto > (valorPrimerCobro ?? 0)
  )) {
    throw new Error('El pago inicial debe ser mayor que cero y no superar el primer cobro.')
  }
  if (datos.pagoInicial) {
    const errorTransaccion = Object.values(erroresTransaccion(
      { ...datos.pagoInicial, referencia: datos.pagoInicial.referencia ?? '' },
      hoyEnClub(),
    ))[0]
    if (errorTransaccion) throw new Error(errorTransaccion)
  }
  const asignacionId = siguienteAsignacionId++
  patinador.planActual = {
    asignacionId,
    planId: plan.id,
    nombre: plan.nombre,
    periodicidad: plan.periodicidad,
    diasPorSemana: plan.diasPorSemana,
    fechaInicio: datos.fechaInicio,
    fechaFin: null,
  }
  let primerCobroId: number | null = null
  if (plan.periodicidad === 'MENSUAL') {
    const fechaLimitePlan = diaDelMes(datos.fechaInicio, plan.diaLimitePago ?? 5)
    const fechaLimite = fechaLimitePlan < datos.fechaInicio ? datos.fechaInicio : fechaLimitePlan
    primerCobroId = siguienteCobroId++
    COBROS_DEMO.push({
      id: primerCobroId,
      patinadorId: patinador.id,
      concepto: 'Mensualidad',
      periodo: datos.fechaInicio.slice(0, 7),
      descripcion: `Plan ${plan.nombre} · ${datos.fechaInicio.slice(0, 7)}`,
      valor: valorPrimerCobro ?? plan.tarifaVigente.valor,
      pagado: 0,
      saldo: valorPrimerCobro ?? plan.tarifaVigente.valor,
      fechaLimite,
      vencidoDesde: fechaLimite < hoyEnClub() ? hoyEnClub() : '',
      vencido: fechaLimite < hoyEnClub(),
    })
  }
  const primerCobro = plan.periodicidad === 'MENSUAL'
    ? {
        id: primerCobroId ?? siguienteCobroId - 1,
        periodo: datos.fechaInicio.slice(0, 7),
        valor: valorPrimerCobro ?? plan.tarifaVigente.valor,
        fechaLimite: (() => {
          const fechaLimitePlan = diaDelMes(datos.fechaInicio, plan.diaLimitePago ?? 5)
          return fechaLimitePlan < datos.fechaInicio ? datos.fechaInicio : fechaLimitePlan
        })(),
        vencidoDesde: '',
        diasCobrados: diasCobradosPrimerMes(datos.fechaInicio),
      }
    : null
  const siguienteFecha = primerDiaMesSiguiente(datos.fechaInicio)
  const resultado: ResultadoAsignacion = {
    asignacionId,
    plan: { id: plan.id, nombre: plan.nombre, periodicidad: plan.periodicidad },
    fechaInicio: datos.fechaInicio,
    tarifa: plan.tarifaVigente.valor,
    primerCobro,
    siguienteCobro: plan.periodicidad === 'MENSUAL'
      ? {
          periodo: siguienteFecha,
          valor: plan.tarifaVigente.valor,
          fechaLimite: diaDelMes(siguienteFecha, plan.diaLimitePago ?? 5),
          vencidoDesde: '',
        }
      : null,
  }
  if (datos.pagoInicial && primerCobroId !== null) {
    const cobro = COBROS_DEMO.find((item) => item.id === primerCobroId)
    if (!cobro) throw new Error('No se encontró el cobro inicial del plan.')
    cobro.pagado += datos.pagoInicial.monto
    cobro.saldo -= datos.pagoInicial.monto
    const pago = crearResultadoPago(
      patinador.id,
      datos.pagoInicial.monto,
      datos.pagoInicial,
      `Pago inicial del plan ${plan.nombre}`,
    )
    resultado.pagoInicial = {
      monto: datos.pagoInicial.monto,
      saldoRestante: cobro.saldo,
      comprobante: pago.comprobante.numero,
    }
  }
  return Promise.resolve(resultado)
}

export function cambiarPlan(datos: { patinadorId: number; planId: number; motivo?: string }): Promise<ResultadoCambio> {
  const patinador = PATINADORES_DEMO.find((item) => item.id === datos.patinadorId)
  const nuevoPlan = buscarPlan(datos.planId)
  if (!patinador?.planActual) throw new Error('El patinador no tiene un plan activo para cambiar.')
  if (nuevoPlan.estado !== 'ACTIVO' || !nuevoPlan.tarifaVigente) throw new Error('El plan no tiene una tarifa vigente.')
  const anterior = patinador.planActual
  patinador.planActual = {
    ...anterior,
    asignacionId: siguienteAsignacionId++,
    planId: nuevoPlan.id,
    nombre: nuevoPlan.nombre,
    periodicidad: nuevoPlan.periodicidad,
    diasPorSemana: nuevoPlan.diasPorSemana,
    fechaInicio: hoyEnClub(),
  }
  const rigeDesde = hoyEnClub()
  return Promise.resolve({
    asignacionId: patinador.planActual.asignacionId,
    planAnterior: { id: anterior.planId, nombre: anterior.nombre },
    planNuevo: { id: nuevoPlan.id, nombre: nuevoPlan.nombre, periodicidad: nuevoPlan.periodicidad },
    rigeDesde,
    tarifa: nuevoPlan.tarifaVigente.valor,
    proximoCobro: nuevoPlan.periodicidad === 'MENSUAL'
      ? {
          periodo: primerDiaMesSiguiente(rigeDesde),
          valor: nuevoPlan.tarifaVigente.valor,
          fechaLimite: diaDelMes(primerDiaMesSiguiente(rigeDesde), nuevoPlan.diaLimitePago ?? 5),
          vencidoDesde: '',
        }
      : null,
    requiereAjusteGrupo: false,
    aviso: null,
  })
}

export async function cobrosPendientes(patinadorId: number): Promise<CobroPendiente[]> {
  actualizarCartera(patinadorId)
  return COBROS_DEMO
    .filter((cobro) => cobro.patinadorId === patinadorId && cobro.saldo > 0)
    .map(({ patinadorId: _patinadorId, ...cobro }) => ({
      ...cobro,
      vencido: cobro.fechaLimite < hoyEnClub(),
    }))
}

export function registrarCobroLocal(datos: {
  patinadorId: number
  concepto: string
  descripcion: string
  valor: number
  fechaLimite: string
}): CobroPendiente {
  if (!PATINADORES_DEMO.some((item) => item.id === datos.patinadorId)) {
    throw new Error('No se encontró el patinador para asociar el cobro.')
  }
  if (!Number.isSafeInteger(datos.valor) || datos.valor <= 0) {
    throw new Error('El cobro debe ser un valor entero mayor que cero.')
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(datos.fechaLimite)) {
    throw new Error('Indica una fecha límite válida.')
  }
  const fechaLimite = new Date(`${datos.fechaLimite}T00:00:00Z`)
  if (Number.isNaN(fechaLimite.getTime()) || fechaLimite.toISOString().slice(0, 10) !== datos.fechaLimite) {
    throw new Error('Indica una fecha límite válida.')
  }
  const cobro = {
    id: siguienteCobroId++,
    patinadorId: datos.patinadorId,
    concepto: datos.concepto,
    periodo: null,
    descripcion: datos.descripcion,
    valor: datos.valor,
    pagado: 0,
    saldo: datos.valor,
    fechaLimite: datos.fechaLimite,
    vencidoDesde: '',
    vencido: datos.fechaLimite < hoyEnClub(),
  }
  COBROS_DEMO.push(cobro)
  actualizarCartera(datos.patinadorId)
  const { patinadorId: _patinadorId, ...respuesta } = cobro
  return respuesta
}

export function historialPagos(patinadorId?: number): Promise<PagoDemo[]> {
  return Promise.resolve(PAGOS_DEMO
    .filter((pago) => patinadorId === undefined || pago.patinadorId === patinadorId)
    .map((pago) => ({ ...pago })))
}

export function saldoCobroLocal(cobroId: number): number | null {
  return COBROS_DEMO.find((cobro) => cobro.id === cobroId)?.saldo ?? null
}

export function pagarCobro(datos: DatosTransaccion & { cobroId: number; monto: number }): Promise<ResultadoPagoCobro> {
  if (!Number.isSafeInteger(datos.monto) || datos.monto <= 0) throw new Error('El monto debe ser un entero mayor que cero.')
  const cobro = COBROS_DEMO.find((item) => item.id === datos.cobroId)
  if (!cobro || cobro.saldo <= 0) throw new Error('No se encontró un cobro pendiente.')
  if (datos.monto > cobro.saldo) throw new Error('El monto supera el saldo pendiente.')
  cobro.pagado += datos.monto
  cobro.saldo -= datos.monto
  const base = crearResultadoPago(
    cobro.patinadorId,
    datos.monto,
    datos,
    cobro.descripcion ?? cobro.concepto,
  )
  return Promise.resolve({
    ...base,
    cobro: {
      id: cobro.id,
      descripcion: cobro.descripcion,
      valor: cobro.valor,
      estado: cobro.saldo === 0 ? 'PAGADO' : 'PENDIENTE',
    },
    saldoAnterior: cobro.saldo + datos.monto,
    saldoRestante: cobro.saldo,
    pagoParcial: cobro.saldo > 0,
  })
}

export function pagarSesiones(
  datos: DatosTransaccion & { patinadorId: number; numeroSesiones: number },
): Promise<ResultadoPagoSesion> {
  const patinador = PATINADORES_DEMO.find((item) => item.id === datos.patinadorId)
  if (!patinador?.planActual || patinador.planActual.periodicidad !== 'POR_SESION') {
    throw new Error('El patinador no tiene un plan de día único activo.')
  }
  if (!Number.isInteger(datos.numeroSesiones) || datos.numeroSesiones < 1 || datos.numeroSesiones > 31) {
    throw new Error('El número de sesiones debe estar entre 1 y 31.')
  }
  const tarifa = buscarPlan(patinador.planActual.planId).tarifaVigente?.valor
  if (!tarifa) throw new Error('El plan no tiene tarifa vigente.')
  return Promise.resolve({
    ...crearResultadoPago(
      datos.patinadorId,
      tarifa * datos.numeroSesiones,
      datos,
      `Pago por ${datos.numeroSesiones} sesión${datos.numeroSesiones === 1 ? '' : 'es'}`,
    ),
    numeroSesiones: datos.numeroSesiones,
    valorSesion: tarifa,
  })
}

export function pagarMatricula(
  datos: DatosTransaccion & { patinadorId: number; valorMatricula: number; valorGastosAdministrativos: number },
): Promise<ResultadoMatricula> {
  const patinador = PATINADORES_DEMO.find((item) => item.id === datos.patinadorId)
  if (!patinador) throw new Error('No se encontró el patinador.')
  if (patinador.matriculaPagada) throw new Error('La matrícula de este patinador ya está pagada.')
  if (!Number.isFinite(datos.valorMatricula) || datos.valorMatricula <= 0 ||
      !Number.isFinite(datos.valorGastosAdministrativos) || datos.valorGastosAdministrativos <= 0) {
    throw new Error('La matrícula y los gastos deben ser mayores que cero.')
  }
  patinador.matriculaPagada = true
  return Promise.resolve(crearResultadoPago(
    datos.patinadorId,
    datos.valorMatricula + datos.valorGastosAdministrativos,
    datos,
    'Pago de matrícula y gastos administrativos',
  ))
}
