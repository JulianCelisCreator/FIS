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
