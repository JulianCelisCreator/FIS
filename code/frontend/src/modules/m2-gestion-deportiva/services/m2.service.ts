import { pedir } from '../../../shared/services/cliente-api.ts'
import type { PerfilNivelActual } from '../types/m2.types.ts'

export function listarPerfilesConNivel(): Promise<PerfilNivelActual[]> {
  return pedir('/m2/nivel-actual/patinadores')
}

export function consultarNivelActual(patinadorId: number): Promise<PerfilNivelActual> {
  return pedir(`/m2/nivel-actual/patinadores/${patinadorId}`)
}
