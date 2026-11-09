// Contratos con la API de M5 (ver code/backend/src/modules/m5-planes-tarifas-pagos/README.md).

export type Periodicidad = 'MENSUAL' | 'POR_SESION'
export type EstadoCartera = 'AL_DIA' | 'PENDIENTE' | 'VENCIDO'
export type MedioPago = 'EFECTIVO' | 'TRANSFERENCIA' | 'CONSIGNACION'

export type TipoPlan = 'DIA_UNICO' | 'TRES_DIAS' | 'SEIS_DIAS' | 'SEIS_DIAS_GIMNASIO'

/** Tipos de plan y su texto (el tipo fija periodicidad, días y gimnasio). */
export const TIPOS_PLAN: { valor: TipoPlan; texto: string; periodicidad: Periodicidad }[] = [
  { valor: 'DIA_UNICO', texto: 'Día único', periodicidad: 'POR_SESION' },
  { valor: 'TRES_DIAS', texto: '3 días/semana', periodicidad: 'MENSUAL' },
  { valor: 'SEIS_DIAS', texto: '6 días/semana', periodicidad: 'MENSUAL' },
  { valor: 'SEIS_DIAS_GIMNASIO', texto: '6 días/semana + gimnasio', periodicidad: 'MENSUAL' },
]

/** Días límite de pago que acepta la API para los planes mensuales. */
export const DIAS_LIMITE_PAGO = [5, 10, 15, 20]

export const PERMISOS_M5 = {
  planGestionar: 'M5_PLAN_GESTIONAR',
  planConsultar: 'M5_PLAN_CONSULTAR',
  planAsignar: 'M5_PLAN_ASIGNAR',
  pagoRegistrar: 'M5_PAGO_REGISTRAR',
} as const

export const MEDIOS_PAGO: { valor: MedioPago; texto: string }[] = [
  { valor: 'EFECTIVO', texto: 'Efectivo' },
  { valor: 'TRANSFERENCIA', texto: 'Transferencia' },
  { valor: 'CONSIGNACION', texto: 'Consignación' },
]

/** Estado de cartera de la API → estado del catálogo de StatusBadge. */
export const ESTADO_CARTERA_DS: Record<EstadoCartera, string> = {
  AL_DIA: 'al-dia',
  PENDIENTE: 'pendiente',
  VENCIDO: 'vencido',
}

/** GET /m5/patinadores */
export interface PatinadorM5 {
  id: number
  nombre: string
  tipoDocumento: string
  numeroDocumento: string
  edad: number
  esMenor: boolean
  acudientes: { id: number; nombre: string; parentesco: string }[]
  planActual: {
    asignacionId: number
    planId: number
    nombre: string
    periodicidad: Periodicidad
    diasPorSemana: number | null
    fechaInicio: string
    fechaFin: string | null
  } | null
  tieneCambioProgramado: boolean
  matriculaPagada: boolean
  estadoCartera: EstadoCartera
}

/** Plan con su tarifa vigente (oferta o listado del Administrador). */
export interface PlanOfertado {
  id: number
  nombre: string
  tipo: string
  periodicidad: Periodicidad
  diasPorSemana: number | null
  incluyeGimnasio: boolean
  diaLimitePago: number | null
  descripcion: string | null
  tarifa: { valor: number; vigenteDesde: string } | null
  /** Solo en el listado del Administrador: un plan inactivo se muestra deshabilitado. */
  asignable: boolean
}

/** GET /m5/planes (Administrador): plan con tarifas, uso y última modificación. */
export interface PlanAdministrado {
  id: number
  nombre: string
  tipo: TipoPlan
  periodicidad: Periodicidad
  diasPorSemana: number | null
  incluyeGimnasio: boolean
  diaLimitePago: number | null
  descripcion: string | null
  estado: 'ACTIVO' | 'INACTIVO'
  tarifaVigente: { valor: number; vigenteDesde: string } | null
  tarifaProgramada: { valor: number; vigenteDesde: string } | null
  patinadores: number
  asignable: boolean
  ultimaModificacion: { por: string; en: string } | null
}

export interface TarifaEnHistorial {
  id: number
  valor: number
  vigenteDesde: string
  vigenteHasta: string | null
  estado: 'PROGRAMADA' | 'VIGENTE' | 'HISTORICA'
  registradoPor: string
  registradoEn: string
}

/** GET /m5/planes/:id y respuesta de crear, editar, desactivar y registrar tarifa. */
export interface PlanDetalle extends PlanAdministrado {
  tarifas: TarifaEnHistorial[]
}

/** GET /m5/patinadores/:id/plan */
export interface PlanDelPatinador {
  actual: AsignacionResumen | null
  programado: AsignacionResumen | null
  historial: AsignacionResumen[]
}

export interface AsignacionResumen {
  id: number
  planId: number
  planNombre: string
  periodicidad: Periodicidad
  diasPorSemana: number | null
  fechaInicio: string
  fechaFin: string | null
}

export interface CobroProyectado {
  periodo: string
  valor: number
  fechaLimite: string
  vencidoDesde: string
}

/** POST /m5/asignaciones */
export interface ResultadoAsignacion {
  asignacionId: number
  plan: { id: number; nombre: string; periodicidad: Periodicidad }
  fechaInicio: string
  tarifa: number
  primerCobro: (CobroProyectado & { id: number; diasCobrados: number }) | null
  siguienteCobro: CobroProyectado | null
  pagoInicial?: { monto: number; saldoRestante: number; comprobante: string }
}

/** POST /m5/asignaciones/cambios */
export interface ResultadoCambio {
  asignacionId: number
  planAnterior: { id: number; nombre: string }
  planNuevo: { id: number; nombre: string; periodicidad: Periodicidad }
  rigeDesde: string
  tarifa: number
  proximoCobro: CobroProyectado | null
  requiereAjusteGrupo: boolean
  aviso: string | null
}

/** GET /m5/patinadores/:id/cobros-pendientes */
export interface CobroPendiente {
  id: number
  concepto: string
  periodo: string | null
  descripcion: string | null
  valor: number
  pagado: number
  saldo: number
  fechaLimite: string
  vencidoDesde: string
  vencido: boolean
}

export interface PagoDemo {
  id: number
  patinadorId: number
  patinadorNombre: string
  concepto: string
  monto: number
  fechaPago: string
  medioPago: MedioPago
  referencia: string
  comprobante: string
  registradoPor: string
}

/** Lo que se escribe en los campos de fecha, medio y referencia (aún sin validar). */
export interface ValoresTransaccion {
  fechaPago: string
  medioPago: MedioPago | ''
  referencia: string
}

export interface DatosTransaccion {
  fechaPago: string
  medioPago: MedioPago
  referencia?: string
}

interface ResultadoPagoBase {
  pagoId: number
  patinadorId: number
  comprobante: { id: number; numero: string }
  estadoCartera: { estado: EstadoCartera; saldoPendiente: number }
  monto: number
}

export interface ResultadoPagoCobro extends ResultadoPagoBase {
  cobro: { id: number; descripcion: string | null; valor: number; estado: 'PAGADO' | 'PENDIENTE' }
  saldoAnterior: number
  saldoRestante: number
  pagoParcial: boolean
}

export interface ResultadoPagoSesion extends ResultadoPagoBase {
  numeroSesiones: number
  valorSesion: number
}

export type ResultadoMatricula = ResultadoPagoBase
