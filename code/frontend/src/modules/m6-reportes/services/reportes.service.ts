// Reportes financieros (HU-6.4) contra la API /m6/reportes.
import { pedir } from '../../../shared/services/cliente-api.ts'
import type { Reporte, TipoReporte } from '../types/reportes.types.ts'

export function generarReporte(tipo: TipoReporte, desde: string, hasta: string): Promise<Reporte> {
  return pedir<Reporte>(`/m6/reportes/${tipo}`, { consulta: { desde, hasta } })
}
