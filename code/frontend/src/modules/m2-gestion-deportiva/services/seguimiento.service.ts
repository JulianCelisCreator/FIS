import { pedir } from '../../../shared/services/cliente-api.ts'
import type {
  CategoriaActualPatinador,
  CategoriaClub,
  CatalogoClub,
  EvaluacionPatinador,
  FichaEntrenamiento,
  HabilidadPatinador,
  HistorialPatinador,
  ObservacionCreada,
  ObservacionPatinador,
  PatinadorAsignacion,
  PropuestaCategoria,
  ResumenEntrenamiento,
  ResultadoEvaluacion,
  EstadoHabilidad,
} from '../types/seguimiento.types.ts'

export function listarCategorias(): Promise<CategoriaClub[]> {
  return pedir('/m2/categorias')
}

export function obtenerCatalogoClub(): Promise<CatalogoClub> {
  return pedir('/m2/catalogo-club')
}

export function crearCategoria(datos: {
  nombre: string
  edadMinima: number
  edadMaxima: number | null
  nivelMinimoId: number | null
  genero: 'FEMENINO' | 'MASCULINO' | 'MIXTO'
}): Promise<CategoriaClub> {
  return pedir('/m2/categorias', { metodo: 'POST', cuerpo: datos })
}

export function editarCategoria(
  categoriaId: number,
  cambios: Partial<{
    nombre: string
    edadMinima: number
    edadMaxima: number | null
    nivelMinimoId: number | null
    genero: 'FEMENINO' | 'MASCULINO' | 'MIXTO'
    activo: boolean
  }>,
): Promise<CategoriaClub> {
  return pedir(`/m2/categorias/${categoriaId}`, { metodo: 'PATCH', cuerpo: cambios })
}

export function listarPatinadoresParaCategoria(buscar?: string): Promise<PatinadorAsignacion[]> {
  return pedir('/m2/asignaciones/patinadores', { consulta: { buscar } })
}

export function asignarCategoria(
  patinadorId: number,
  categoriaId: number,
  motivo?: string,
): Promise<{ patinadorId: number; categoriaId: number; categoria: string; desde: string }> {
  return pedir(`/m2/patinadores/${patinadorId}/categoria`, { metodo: 'POST', cuerpo: { categoriaId, motivo } })
}

export function cambiarCategoria(
  patinadorId: number,
  categoriaId: number,
  motivo?: string,
): Promise<{ patinadorId: number; categoriaAnterior: string; categoria: string; categoriaId: number; desde: string }> {
  return pedir(`/m2/patinadores/${patinadorId}/categoria/cambio`, { metodo: 'POST', cuerpo: { categoriaId, motivo } })
}

export function listarPropuestas(estado?: 'PROPUESTA' | 'APROBADA' | 'RECHAZADA'): Promise<PropuestaCategoria[]> {
  return pedir('/m2/propuestas-categoria', { consulta: { estado } })
}

export function proponerCategoria(datos: {
  patinadorId: number
  categoriaId: number
  justificacion: string
}): Promise<{ modo: 'PROPUESTA' | 'EJECUTADO'; propuestaId: number; patinadorId: number; categoria?: string }> {
  return pedir('/m2/propuestas-categoria', { metodo: 'POST', cuerpo: datos })
}

export function aprobarPropuesta(propuestaId: number): Promise<{ propuestaId: number; categoria: string }> {
  return pedir(`/m2/propuestas-categoria/${propuestaId}/aprobar`, { metodo: 'POST' })
}

export function rechazarPropuesta(propuestaId: number, motivo?: string): Promise<{ propuestaId: number; estado: 'RECHAZADA' }> {
  return pedir(`/m2/propuestas-categoria/${propuestaId}/rechazar`, { metodo: 'POST', cuerpo: { motivo } })
}

export function listarEntrenamiento(): Promise<ResumenEntrenamiento[]> {
  return pedir('/m2/entrenamiento/patinadores')
}

export function obtenerFichaEntrenamiento(patinadorId: number): Promise<FichaEntrenamiento> {
  return pedir(`/m2/entrenamiento/patinadores/${patinadorId}`)
}

export function registrarEvaluacion(
  patinadorId: number,
  datos: { nivelEvaluadoId: number; resultado: ResultadoEvaluacion; observacion?: string },
): Promise<{ evaluacionId: number; nivel: string; resultado: ResultadoEvaluacion; fecha: string; nivelActualizado: boolean }> {
  return pedir(`/m2/patinadores/${patinadorId}/evaluaciones`, { metodo: 'POST', cuerpo: datos })
}

export function listarHabilidades(patinadorId: number): Promise<HabilidadPatinador[]> {
  return pedir(`/m2/patinadores/${patinadorId}/habilidades`)
}

export function guardarHabilidades(
  patinadorId: number,
  habilidades: { habilidadId: number; estado: EstadoHabilidad }[],
): Promise<HabilidadPatinador[]> {
  return pedir(`/m2/patinadores/${patinadorId}/habilidades`, { metodo: 'PUT', cuerpo: { habilidades } })
}

export function listarObservaciones(patinadorId: number): Promise<ObservacionPatinador[]> {
  return pedir(`/m2/patinadores/${patinadorId}/observaciones`)
}

export function crearObservacion(
  patinadorId: number,
  datos: { texto: string; visibleParaPatinador: boolean },
): Promise<ObservacionCreada> {
  return pedir(`/m2/patinadores/${patinadorId}/observaciones`, { metodo: 'POST', cuerpo: datos })
}

export function obtenerHistorial(patinadorId: number): Promise<HistorialPatinador> {
  return pedir(`/m2/patinadores/${patinadorId}/historial`)
}

export function obtenerCategoriasActuales(): Promise<CategoriaActualPatinador[]> {
  return pedir('/m2/categoria-actual')
}

export function listarMisObservaciones(): Promise<ObservacionPatinador[]> {
  return pedir('/m2/mis-observaciones')
}

export function obtenerEstadoObservaciones(): Promise<{ habilitada: boolean }> {
  return pedir('/m2/parametros/observaciones-visibles')
}

export function configurarObservaciones(habilitada: boolean): Promise<{ habilitada: boolean }> {
  return pedir('/m2/parametros/observaciones-visibles', { metodo: 'PUT', cuerpo: { habilitada } })
}
