import { useEffect, useState, type ReactNode } from 'react'
import { ErrorApi, EVENTO_SESION_VENCIDA, pedir } from '../services/cliente-api.ts'
import type { Rol, Sesion } from './sesion.types.ts'
import { SesionContexto } from './use-sesion.ts'

/**
 * Sesión del usuario (RF-M1-02). El token vive en una cookie httpOnly que el
 * navegador envía solo; aquí se consulta GET /sesion al abrir la aplicación y
 * se guarda la sesión que devuelve el ingreso.
 */
export function ProveedorSesion({ children }: { children: ReactNode }) {
  const [sesion, setSesion] = useState<Sesion | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let vigente = true
    pedir<Sesion>('/sesion')
      .then((actual) => vigente && setSesion(actual))
      .catch((e: Error) => {
        // 401 = no hay sesión abierta: no es un error, se muestra el acceso.
        if (vigente && !(e instanceof ErrorApi && e.estado === 401)) setError(e.message)
      })
      .finally(() => vigente && setCargando(false))
    return () => {
      vigente = false
    }
  }, [])

  useEffect(() => {
    const alVencer = () => setSesion(null)
    window.addEventListener(EVENTO_SESION_VENCIDA, alVencer)
    return () => window.removeEventListener(EVENTO_SESION_VENCIDA, alVencer)
  }, [])

  const establecerSesion = (nueva: Sesion | null) => {
    setSesion(nueva)
    setError(null)
  }

  return (
    <SesionContexto
      value={{
        sesion,
        cargando,
        error,
        establecerSesion,
        tienePermiso: (permiso: string) => sesion?.permisos.includes(permiso) ?? false,
        tieneRol: (rol: Rol) => sesion?.roles.includes(rol) ?? false,
      }}
    >
      {children}
    </SesionContexto>
  )
}
