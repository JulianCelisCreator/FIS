import { useEffect, useState, type ReactNode } from 'react'
import { ErrorApi, pedir } from '../services/cliente-api.ts'
import type { Rol, Sesion } from './sesion.types.ts'
import { SesionContexto } from './use-sesion.ts'

/**
 * Sesión del usuario (HU-M1-02 y HU-M1-03). El token vive en una cookie httpOnly que el
 * navegador envía solo; aquí se consulta GET /sesion al abrir la aplicación y
 * se guarda la sesión que devuelve el ingreso.
 */
export function ProveedorSesion({ children }: { children: ReactNode }) {
  const [sesion, setSesion] = useState<Sesion | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sesionRecienCerrada, setSesionRecienCerrada] = useState(false)

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

  const establecerSesion = (nueva: Sesion) => {
    setSesion(nueva)
    setError(null)
    setSesionRecienCerrada(false)
  }

  const cerrarSesion = async () => {
    try {
      await pedir<void>(
        '/sesion',
        { metodo: 'DELETE' } as unknown as Parameters<typeof pedir>[1],
      )
    } catch (e) {
      // 401 = la sesión ya no existía en el servidor: el resultado es el mismo.
      // Cualquier otro error (sin conexión, 5xx) deja la sesión abierta y se informa.
      if (!(e instanceof ErrorApi && e.estado === 401)) throw e
    }
    // La ruta de la sesión anterior no debe quedar para quien ingrese después.
    window.location.hash = ''
    setSesion(null)
    setError(null)
    setSesionRecienCerrada(true)
  }

  const valorSesionContexto = {
    sesion,
    cargando,
    error,
    establecerSesion,
    cerrarSesion,
    sesionRecienCerrada,
    tienePermiso: (permiso: string) => sesion?.permisos.includes(permiso) ?? false,
    tieneRol: (rol: Rol) => sesion?.roles.includes(rol) ?? false,
  } as unknown as Parameters<typeof SesionContexto.Provider>[0]['value']

  return (
    <SesionContexto.Provider value={valorSesionContexto}>
      {children}
    </SesionContexto.Provider>
  )
}