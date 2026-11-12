// Cliente HTTP de la aplicación. Por ahora llama directo a la API NestJS por
// /api (proxy de Vite en desarrollo); cuando exista el BFF, solo cambia aquí.

const BASE = '/api'
const CLAVE_USUARIO = 'escuela.usuarioPruebaId'

/** Error de la API con el mensaje en español que devuelve el backend. */
export class ErrorApi extends Error {
  readonly estado: number

  constructor(estado: number, mensaje: string) {
    super(mensaje)
    this.name = 'ErrorApi'
    this.estado = estado
  }
}

/**
 * TEMPORAL: usuario con el que se prueba, enviado en la cabecera x-usuario-id,
 * mientras M1 implementa el inicio de sesión.
 */
export function usuarioPruebaGuardado(): number | null {
  try {
    const valor = Number(localStorage.getItem(CLAVE_USUARIO))
    return Number.isInteger(valor) && valor > 0 ? valor : null
  } catch {
    return null
  }
}

export function guardarUsuarioPrueba(id: number | null): void {
  try {
    if (id === null) localStorage.removeItem(CLAVE_USUARIO)
    else localStorage.setItem(CLAVE_USUARIO, String(id))
  } catch {
    // Sin almacenamiento disponible: la elección dura lo que dure la página.
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
  const usuarioId = usuarioPruebaGuardado()
  if (usuarioId) cabeceras['x-usuario-id'] = String(usuarioId)
  if (opciones.cuerpo !== undefined) cabeceras['Content-Type'] = 'application/json'

  let respuesta: Response
  try {
    respuesta = await fetch(url, {
      method: opciones.metodo ?? 'GET',
      headers: cabeceras,
      body: opciones.cuerpo === undefined ? undefined : JSON.stringify(opciones.cuerpo),
    })
  } catch {
    throw new ErrorApi(0, mensajeDeError(null, 0))
  }

  const cuerpo: unknown = await respuesta.json().catch(() => null)
  if (!respuesta.ok) throw new ErrorApi(respuesta.status, mensajeDeError(cuerpo, respuesta.status))
  return cuerpo as T
}
