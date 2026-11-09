import { useEffect, useState, type ReactNode } from 'react'
import {
  guardarUsuarioPrueba,
  pedir,
  usuarioPruebaGuardado,
} from '../services/cliente-api.ts'
import { PERMISOS_M5 } from '../../modules/m5-planes-tarifas-pagos/types/m5.types.ts'
import { PERMISOS_M6 } from '../../modules/m6-inventario-uniformes/types/inventario.types.ts'
import type { Rol, Sesion, UsuarioPrueba } from './sesion.types.ts'
import { SesionContexto } from './use-sesion.ts'

const ID_USUARIO_DEMO = -1
const USUARIO_DEMO: UsuarioPrueba = {
  id: ID_USUARIO_DEMO,
  nombre: 'Demo local M5/M6',
  correo: 'demo-local@escuela.test',
  roles: ['ADMINISTRADOR', 'CONTADOR'],
}
const SESION_DEMO: Sesion = {
  ...USUARIO_DEMO,
  permisos: [
    PERMISOS_M5.planGestionar,
    PERMISOS_M5.planConsultar,
    PERMISOS_M5.planAsignar,
    PERMISOS_M5.pagoRegistrar,
    PERMISOS_M6.inventarioGestionar,
  ],
}

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
  const [usuarioId, setUsuarioId] = useState<number | null>(usuarioPruebaGuardado() ?? ID_USUARIO_DEMO)
  const [respuesta, setRespuesta] = useState<RespuestaSesion | null>(null)
  const [usuarios, setUsuarios] = useState<UsuarioPrueba[]>([USUARIO_DEMO])
  const [errorUsuarios, setErrorUsuarios] = useState<string | null>(null)

  useEffect(() => {
    pedir<UsuarioPrueba[]>('/sesion/usuarios')
      .then((usuariosApi) => setUsuarios([USUARIO_DEMO, ...usuariosApi.filter((usuario) => usuario.id !== ID_USUARIO_DEMO)]))
      .catch((e: Error) => setErrorUsuarios(e.message))
  }, [])

  useEffect(() => {
    if (usuarioId === null) return
    if (usuarioId === ID_USUARIO_DEMO) return
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
  const sesion = usuarioId === ID_USUARIO_DEMO ? SESION_DEMO : vigente?.sesion ?? null

  const cambiarUsuario = (id: number | null) => {
    guardarUsuarioPrueba(id)
    setUsuarioId(id)
  }

  return (
    <SesionContexto
      value={{
        sesion,
        usuarios,
        cargando: usuarioId !== null && usuarioId !== ID_USUARIO_DEMO && vigente === null,
        error: usuarioId === ID_USUARIO_DEMO ? null : vigente?.error ?? errorUsuarios,
        cambiarUsuario,
        tienePermiso: (permiso: string) => sesion?.permisos.includes(permiso) ?? false,
        tieneRol: (rol: Rol) => sesion?.roles.includes(rol) ?? false,
      }}
    >
      {children}
    </SesionContexto>
  )
}
