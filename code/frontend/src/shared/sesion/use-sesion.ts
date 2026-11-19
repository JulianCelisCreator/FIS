import { createContext, useContext } from 'react'
import type { ContextoSesion } from './sesion.types.ts'

export const SesionContexto = createContext<ContextoSesion | null>(null)

/** Usuario actual y sus permisos; debe usarse dentro de <ProveedorSesion>. */
export function useSesion(): ContextoSesion {
  const contexto = useContext(SesionContexto)
  if (!contexto) throw new Error('useSesion debe usarse dentro de <ProveedorSesion>')
  return contexto
}
