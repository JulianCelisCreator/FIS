import { useEffect, useState } from 'react'

export interface Ruta {
  /** Pantalla, p. ej. 'registrar-pago'. */
  pagina: string
  /** Parámetros de la ruta, p. ej. { pestana: 'matricula', patinador: '12' }. */
  parametros: URLSearchParams
}

function leerRuta(): Ruta {
  // #/registrar-pago?pestana=matricula&patinador=12
  const [pagina, consulta = ''] = window.location.hash.replace(/^#\/?/, '').split('?')
  return { pagina, parametros: new URLSearchParams(consulta) }
}

/**
 * Navegación por hash (#/pantalla?parametros). Funciona igual en desarrollo y en
 * cualquier hosting estático, sin configurar redirecciones del servidor.
 */
export function useRuta(): Ruta {
  const [ruta, setRuta] = useState(leerRuta)
  useEffect(() => {
    const alCambiar = () => setRuta(leerRuta())
    window.addEventListener('hashchange', alCambiar)
    return () => window.removeEventListener('hashchange', alCambiar)
  }, [])
  return ruta
}

export function enlace(pagina: string, parametros: Record<string, string | number> = {}): string {
  const consulta = new URLSearchParams(
    Object.entries(parametros).map(([clave, valor]) => [clave, String(valor)]),
  ).toString()
  return `#/${pagina}${consulta ? `?${consulta}` : ''}`
}
