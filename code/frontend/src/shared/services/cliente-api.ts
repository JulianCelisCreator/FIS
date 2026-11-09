// Cliente HTTP de la aplicación. Por ahora llama directo a la API NestJS por
// /api (proxy de Vite en desarrollo); cuando exista el BFF, solo cambia aquí.
// La sesión viaja en una cookie httpOnly del mismo origen: el navegador la
// envía solo y JavaScript no la puede leer.

const BASE = '/api'

/** Se emite en window cuando la API rechaza la sesión; ProveedorSesion vuelve al acceso. */
export const EVENTO_SESION_VENCIDA = 'velora:sesion-vencida'

/** Error de la API con el mensaje en español que devuelve el backend. */
export class ErrorApi extends Error {
  readonly estado: number

  constructor(estado: number, mensaje: string) {
    super(mensaje)
    this.name = 'ErrorApi'
    this.estado = estado
  }
}

function mensajeDeError(cuerpo: unknown, estado: number): string {
  if (cuerpo && typeof cuerpo === 'object' && 'message' in cuerpo) {
    const { message } = cuerpo as { message: unknown }
    if (Array.isArray(message)) return message.join('. ')
    if (typeof message === 'string') return message
  }
  if (estado === 0) return 'No hay conexión con el servidor. Revisa que la API esté encendida.'
  return 'Ocurrió un error inesperado. Intenta de nuevo.'
}

export async function pedir<T>(
  ruta: string,
  opciones: { metodo?: 'GET' | 'POST' | 'PATCH'; cuerpo?: unknown; consulta?: Record<string, string | undefined> } = {},
): Promise<T> {
  const parametros = new URLSearchParams()
  for (const [clave, valor] of Object.entries(opciones.consulta ?? {})) {
    if (valor !== undefined && valor !== '') parametros.set(clave, valor)
  }
  const url = `${BASE}${ruta}${parametros.size ? `?${parametros}` : ''}`

  const cabeceras: Record<string, string> = { Accept: 'application/json' }
  if (opciones.cuerpo !== undefined) cabeceras['Content-Type'] = 'application/json'

  let respuesta: Response
  try {
    respuesta = await fetch(url, {
      method: opciones.metodo ?? 'GET',
      headers: cabeceras,
      credentials: 'same-origin',
      body: opciones.cuerpo === undefined ? undefined : JSON.stringify(opciones.cuerpo),
    })
  } catch {
    throw new ErrorApi(0, mensajeDeError(null, 0))
  }

  const cuerpo: unknown = await respuesta.json().catch(() => null)
  // Una ruta protegida respondió 401: la sesión venció o se cerró en otra pestaña.
  if (respuesta.status === 401 && !ruta.startsWith('/m1/acceso/')) window.dispatchEvent(new Event(EVENTO_SESION_VENCIDA))
  if (!respuesta.ok) throw new ErrorApi(respuesta.status, mensajeDeError(cuerpo, respuesta.status))
  return cuerpo as T
}
