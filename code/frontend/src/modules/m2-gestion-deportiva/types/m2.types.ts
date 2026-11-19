export const PERMISOS_M2 = {
  nivelGestionar: 'M2_NIVEL_GESTIONAR',
} as const

export interface NivelPatinaje {
  id: number
  nombre: string
  descripcion: string | null
  orden: number
  activo: boolean
  patinadoresAsignados: number
  actualizadoEn: string
}
