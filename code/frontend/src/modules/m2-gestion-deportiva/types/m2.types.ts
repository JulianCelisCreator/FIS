export const PERMISOS_M2 = {
  patinadorGestionar: 'M2_PATINADOR_GESTIONAR',
} as const

export interface PerfilPatinador {
  id: number
  tipoDocumento: string
  numeroDocumento: string
  nombres: string
  apellidos: string
  fechaNacimiento: string
  genero: 'FEMENINO' | 'MASCULINO'
  telefonoContacto: string | null
  activo: boolean
}

export interface DatosPerfilPatinador {
  tipoDocumento: string
  numeroDocumento: string
  nombres: string
  apellidos: string
  fechaNacimiento: string
  genero: 'FEMENINO' | 'MASCULINO'
  telefonoContacto?: string | null
}
