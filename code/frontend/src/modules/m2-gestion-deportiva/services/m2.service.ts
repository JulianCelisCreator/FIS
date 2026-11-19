import { pedir } from '../../../shared/services/cliente-api.ts'
import type { NivelPatinaje } from '../types/m2.types.ts'

export function listarNiveles(): Promise<NivelPatinaje[]> {
  return pedir('/m2/niveles')
}

export function crearNivel(datos: { nombre: string; descripcion?: string; orden: number }): Promise<NivelPatinaje> {
  return pedir('/m2/niveles', { metodo: 'POST', cuerpo: datos })
}

export function actualizarNivel(
  nivelId: number,
  cambios: { nombre?: string; descripcion?: string | null; orden?: number; activo?: boolean },
): Promise<NivelPatinaje> {
  return pedir(`/m2/niveles/${nivelId}`, { metodo: 'PATCH', cuerpo: cambios })
}
