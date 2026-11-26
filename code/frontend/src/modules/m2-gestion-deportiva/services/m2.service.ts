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
import { pedir } from '../../../shared/services/cliente-api.ts'
import type { AcudienteDisponible, PatinadorConAcudientes } from '../types/m2.types.ts'

export function listarPatinadores(buscar?: string): Promise<PatinadorConAcudientes[]> {
  return pedir('/m2/patinadores', { consulta: { buscar } })
}

export function listarAcudientes(buscar?: string): Promise<AcudienteDisponible[]> {
  return pedir('/m2/acudientes', { consulta: { buscar } })
}

export function vincularAcudiente(
  patinadorId: number,
  datos: { acudienteId: number; parentesco: string; esPrincipal: boolean },
): Promise<{ id: number }> {
  return pedir(`/m2/patinadores/${patinadorId}/acudientes`, { metodo: 'POST', cuerpo: datos })
}
