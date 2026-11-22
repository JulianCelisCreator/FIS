// Panel general administrativo (HU-6.1) contra la API /m6/panel.
import { pedir } from '../../../shared/services/cliente-api.ts'
import type { PanelAdministrativo } from '../types/panel.types.ts'

export function consultarPanel(desde?: string, hasta?: string): Promise<PanelAdministrativo> {
  return pedir<PanelAdministrativo>('/m6/panel', { consulta: { desde, hasta } })
}
