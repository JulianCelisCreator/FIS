export const PERMISOS_M2 = {
  patinadorGestionar: 'M2_PATINADOR_GESTIONAR',
  acudienteGestionar: 'M2_ACUDIENTE_GESTIONAR',
  nivelGestionar: 'M2_NIVEL_GESTIONAR',
  nivelConsultar: 'M2_NIVEL_CONSULTAR',
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
