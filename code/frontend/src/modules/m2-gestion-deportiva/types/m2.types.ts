export const PERMISOS_M2 = {
  acudienteGestionar: 'M2_ACUDIENTE_GESTIONAR',
  nivelGestionar: 'M2_NIVEL_GESTIONAR',
  nivelConsultar: 'M2_NIVEL_CONSULTAR',
} as const

export interface AcudienteDisponible {
  id: number
  nombre: string
  tipoDocumento: string | null
  numeroDocumento: string | null
  correo: string
}

export interface AcudienteVinculado extends AcudienteDisponible {
  parentesco: string
  esPrincipal: boolean
}

export interface PatinadorConAcudientes {
  id: number
  nombre: string
  tipoDocumento: string
  numeroDocumento: string
  fechaNacimiento: string
  acudientes: AcudienteVinculado[]
}
