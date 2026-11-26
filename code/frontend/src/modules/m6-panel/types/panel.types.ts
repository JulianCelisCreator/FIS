// Contrato de GET /m6/panel (HU-6.1 / RF-M6-01).

export const PERMISOS_PANEL = {
  panelConsultar: 'M6_PANEL_CONSULTAR',
} as const

export interface PanelAdministrativo {
  desde: string
  hasta: string
  generadoEn: string
  patinadoresActivos: number
  gruposActivos: number
  profesoresActivos: number
  carteraPendiente: number
  patinadoresEnMora: number
  ingresosPeriodo: number
  unidadesDisponibles: number
  referenciasActivas: number
  referenciasBajoMinimo: number
}
