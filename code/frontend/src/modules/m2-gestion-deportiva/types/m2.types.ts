export const PERMISOS_M2 = {
  nivelConsultar: 'M2_NIVEL_CONSULTAR',
} as const

export interface PerfilNivelActual {
  id: number
  nombre: string
  nivelActual: { nombre: string; orden: number; desde: string } | null
}
