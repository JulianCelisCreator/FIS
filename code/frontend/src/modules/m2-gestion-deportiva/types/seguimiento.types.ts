export const PERMISOS_M2_SEGUIMIENTO = {
  categoriaGestionar: 'M2_CATEGORIA_GESTIONAR',
  categoriaConsultar: 'M2_CATEGORIA_CONSULTAR',
  asignacionGestionar: 'M2_ASIGNACION_GESTIONAR',
  categoriaProponer: 'M2_CATEGORIA_PROPONER',
  categoriaPromoverDirecto: 'M2_CATEGORIA_PROMOVER_DIRECTO',
  categoriaActualConsultar: 'M2_CATEGORIA_ACTUAL_CONSULTAR',
  historialConsultar: 'M2_HISTORIAL_CONSULTAR',
  entrenamientoConsultar: 'M2_ENTRENAMIENTO_CONSULTAR',
  seguimientoRegistrar: 'M2_SEGUIMIENTO_REGISTRAR',
  observacionPropiaConsultar: 'M2_OBSERVACION_PROPIA_CONSULTAR',
  observacionHabilitar: 'M2_OBSERVACION_HABILITAR',
} as const

export type GeneroCategoria = 'FEMENINO' | 'MASCULINO' | 'MIXTO'
export type ResultadoEvaluacion = 'APROBADO' | 'EN_PROCESO' | 'NO_APROBADO'
export type EstadoHabilidad = 'ADQUIRIDA' | 'PENDIENTE'
export type EstadoPropuesta = 'PROPUESTA' | 'APROBADA' | 'RECHAZADA'

export interface NivelClub {
  id: number
  nombre: string
  orden: number
  descripcion?: string | null
}

export interface CategoriaClub {
  id: number
  nombre: string
  edadMinima: number
  edadMaxima: number | null
  genero: GeneroCategoria
  nivelMinimo: NivelClub | null
  activo: boolean
  patinadoresAsignados?: number
}

export interface CatalogoClub {
  categorias: CategoriaClub[]
  niveles?: NivelClub[]
}

export interface PatinadorAsignacion {
  id: number
  nombre: string
  fechaNacimiento: string
  genero: 'FEMENINO' | 'MASCULINO'
  nivelActual: string | null
  categoriaActual: string | null
  categoriaDesde: string | null
  propuestaPendiente: boolean
}

export interface PropuestaCategoria {
  id: number
  patinadorId: number
  patinador: string
  categoriaActualId: number
  categoriaActual: string
  categoriaPropuestaId: number
  categoriaPropuesta: string
  justificacion: string
  estado: EstadoPropuesta
  propuestaPor: number
  propuestaPorNombre: string
  propuestaEn: string
  resueltaEn: string | null
}

export interface ResumenEntrenamiento {
  id: number
  nombre: string
  fechaNacimiento: string
  genero: string
  grupo: string | null
  categoria: string | null
  nivel: string | null
  habilidadesAdquiridas: number
  habilidadesPendientes: number
}

export interface HabilidadPatinador {
  habilidadId: number
  nombre: string
  descripcion: string | null
  nivelId: number
  nivel: string
  nivelOrden: number
  estado: EstadoHabilidad | null
}

export interface EvaluacionPatinador {
  id: number
  fecha: string
  nivel: string
  resultado: ResultadoEvaluacion
  observacion: string | null
  profesor: string
}

export interface ObservacionPatinador {
  id: number
  fecha: string
  texto: string
  visibleParaPatinador: boolean
  profesor: string
}

export interface ObservacionCreada {
  id: number
  fecha: string
  texto: string
  visible: boolean
}

export interface FichaEntrenamiento extends ResumenEntrenamiento {
  habilidades: HabilidadPatinador[]
  evaluaciones: EvaluacionPatinador[]
  observaciones: ObservacionPatinador[]
}

export interface EntradaTrayectoria {
  tipo: 'NIVEL' | 'CATEGORIA'
  id: number
  nombre: string
  desde: string
  hasta: string | null
  motivo: string | null
  vigente: boolean
}

export interface HistorialPatinador {
  patinadorId: number
  nombre: string
  trayectoria: EntradaTrayectoria[]
  evaluaciones?: EvaluacionPatinador[]
}

export interface CategoriaActualPatinador {
  patinadorId: number
  nombre: string
  categoria: { nombre: string; desde: string } | null
}
