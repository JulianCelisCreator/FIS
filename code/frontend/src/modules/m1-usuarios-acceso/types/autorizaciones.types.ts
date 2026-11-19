/** Tipos de HU-M1-09 · Autorización del acudiente. */

export type EstadoPerfil = 'BLOQUEADO' | 'HABILITADO'
export type RequisitoPerfil = 'AUTORIZACION' | 'POLIZA'

export interface AcudienteVinculado {
  id: number
  nombre: string
  parentesco: string
  esPrincipal: boolean
}

export interface AutorizacionRegistrada {
  id: number
  /** Fecha del registro, 'AAAA-MM-DD'. */
  fechaAutorizacion: string
  /** Fecha y hora exactas del registro, ISO. */
  registradaEn: string
  versionTexto: string
  acudiente: { id: number; nombre: string }
}

export interface PerfilPatinador {
  estado: EstadoPerfil
  tienePolizaVigente: boolean
  requisitosFaltantes: RequisitoPerfil[]
}

/** Patinador tal como lo ven el acudiente y el Administrador en la pantalla. */
export interface PatinadorConAutorizacion {
  id: number
  nombre: string
  tipoDocumento: string
  numeroDocumento: string
  edad: number
  esMenor: boolean
  activo: boolean
  acudientes: AcudienteVinculado[]
  autorizacion: AutorizacionRegistrada | null
  perfil: PerfilPatinador
}

/** Detalle con lo necesario para la Card y el diálogo de registro. */
export interface DetalleAutorizacion extends PatinadorConAutorizacion {
  puedeRegistrar: boolean
  motivoNoRegistra: string | null
  texto: { version: string; contenido: string }
}

/** Cuerpo de POST /m1/autorizaciones/:patinadorId. */
export interface DatosRegistrarAutorizacion {
  acepta: true
  versionTexto: string
  /** Solo lo envía el Administrador cuando registra en nombre de un acudiente. */
  acudienteId?: number
}
