import { pedir } from '../../../shared/services/cliente-api.ts'
import type {
  AcudienteDisponible,
  DatosPerfilPatinador,
  NivelPatinaje,
  PatinadorConAcudientes,
  PerfilPatinador,
} from '../types/m2.types.ts'

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

export function listarPerfilesPatinador(): Promise<PerfilPatinador[]> {
  return pedir('/m2/perfiles-patinador')
}

export function crearPerfilPatinador(datos: DatosPerfilPatinador): Promise<PerfilPatinador> {
  return pedir('/m2/perfiles-patinador', { metodo: 'POST', cuerpo: datos })
}

export function actualizarPerfilPatinador(id: number, cambios: Partial<DatosPerfilPatinador>): Promise<PerfilPatinador> {
  return pedir(`/m2/perfiles-patinador/${id}`, { metodo: 'PATCH', cuerpo: cambios })
}

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
