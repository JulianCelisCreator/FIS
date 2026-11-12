import { useEffect, useState, type ReactNode } from 'react'
import {
  guardarUsuarioPrueba,
  pedir,
  usuarioPruebaGuardado,
} from '../services/cliente-api.ts'
import type { Rol, Sesion, UsuarioPrueba } from './sesion.types.ts'
import { SesionContexto } from './use-sesion.ts'

interface RespuestaSesion {
  usuarioId: number
  sesion: Sesion | null
  error: string | null
}

/**
 * TEMPORAL hasta que M1 implemente el inicio de sesión: el usuario se elige de
 * una lista de prueba y se envía en la cabecera x-usuario-id.
 */
export function ProveedorSesion({ children }: { children: ReactNode }) {
  const [usuarioId, setUsuarioId] = useState<number | null>(usuarioPruebaGuardado)
  const [respuesta, setRespuesta] = useState<RespuestaSesion | null>(null)
  const [usuarios, setUsuarios] = useState<UsuarioPrueba[]>([])
  const [errorUsuarios, setErrorUsuarios] = useState<string | null>(null)

  useEffect(() => {
    pedir<UsuarioPrueba[]>('/sesion/usuarios')
      .then(setUsuarios)
      .catch((e: Error) => setErrorUsuarios(e.message))
  }, [])

  useEffect(() => {
    if (usuarioId === null) return
    let vigente = true
    pedir<Sesion>('/sesion')
      .then((sesion) => vigente && setRespuesta({ usuarioId, sesion, error: null }))
      .catch((e: Error) => vigente && setRespuesta({ usuarioId, sesion: null, error: e.message }))
    return () => {
      vigente = false
    }
  }, [usuarioId])

  // La respuesta solo vale si es del usuario elegido ahora.
  const vigente = usuarioId !== null && respuesta?.usuarioId === usuarioId ? respuesta : null
  const sesion = vigente?.sesion ?? null

  const cambiarUsuario = (id: number | null) => {
    guardarUsuarioPrueba(id)
    setUsuarioId(id)
  }

  return (
    <SesionContexto
      value={{
        sesion,
        usuarios,
        cargando: usuarioId !== null && vigente === null,
        error: vigente?.error ?? errorUsuarios,
        cambiarUsuario,
        tienePermiso: (permiso: string) => sesion?.permisos.includes(permiso) ?? false,
        tieneRol: (rol: Rol) => sesion?.roles.includes(rol) ?? false,
      }}
    >
      {children}
    </SesionContexto>
  )
}
