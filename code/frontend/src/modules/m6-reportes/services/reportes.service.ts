// Reportes financieros (HU-6.4) y su exportación (HU-6.5) contra /m6/reportes.
import { ErrorApi, pedir } from '../../../shared/services/cliente-api.ts'
import type { FormatoExportacion, Reporte, TipoReporte } from '../types/reportes.types.ts'

export function generarReporte(tipo: TipoReporte, desde: string, hasta: string): Promise<Reporte> {
  return pedir<Reporte>(`/m6/reportes/${tipo}`, { consulta: { desde, hasta } })
}

/**
 * Descarga el archivo que genera el servidor. `pedir()` solo maneja JSON, así
 * que aquí se pide el binario directamente (misma cookie de sesión) y se
 * dispara la descarga con el nombre que envía el servidor.
 */
export async function descargarReporte(
  reporte: Pick<Reporte, 'tipo' | 'desde' | 'hasta'>,
  formato: FormatoExportacion,
): Promise<string> {
  const consulta = new URLSearchParams({ formato, desde: reporte.desde, hasta: reporte.hasta })
  let respuesta: Response
  try {
    respuesta = await fetch(`/api/m6/reportes/${reporte.tipo}/exportar?${consulta}`, { credentials: 'same-origin' })
  } catch {
    throw new ErrorApi(0, 'No hay conexión con el servidor. Revisa que la API esté encendida.')
  }
  if (!respuesta.ok) {
    const cuerpo = (await respuesta.json().catch(() => null)) as { message?: string } | null
    throw new ErrorApi(respuesta.status, cuerpo?.message ?? 'No se pudo generar el archivo del reporte.')
  }
  const nombre = /filename="([^"]+)"/.exec(respuesta.headers.get('Content-Disposition') ?? '')?.[1]
    ?? `Reporte.${formato}`
  const url = URL.createObjectURL(await respuesta.blob())
  const enlace = document.createElement('a')
  enlace.href = url
  enlace.download = nombre
  document.body.append(enlace)
  enlace.click()
  enlace.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  return nombre
}
