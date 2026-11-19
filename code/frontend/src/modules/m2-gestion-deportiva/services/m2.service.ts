import { pedir } from '../../../shared/services/cliente-api.ts'
import type { DatosPerfilPatinador, PerfilPatinador } from '../types/m2.types.ts'

export function listarPerfilesPatinador(): Promise<PerfilPatinador[]> {
  return pedir('/m2/perfiles-patinador')
}

export function crearPerfilPatinador(datos: DatosPerfilPatinador): Promise<PerfilPatinador> {
  return pedir('/m2/perfiles-patinador', { metodo: 'POST', cuerpo: datos })
}

export function actualizarPerfilPatinador(id: number, cambios: Partial<DatosPerfilPatinador>): Promise<PerfilPatinador> {
  return pedir(`/m2/perfiles-patinador/${id}`, { metodo: 'PATCH', cuerpo: cambios })
}
