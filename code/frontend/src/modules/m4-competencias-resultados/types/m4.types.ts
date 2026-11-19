export type EstadoCompetencia = 'BORRADOR' | 'PUBLICADA' | 'CANCELADA' | 'FINALIZADA'
export type TipoCompetencia = 'INTERNA' | 'FEDERADA' | 'FESTIVAL'
export type ModalidadPrueba = 'CONTRARRELOJ' | 'PUNTOS' | 'ELIMINACION' | 'RELEVOS' | 'VELOCIDAD' | 'FONDO'
export type GeneroPrueba = 'FEMENINO' | 'MASCULINO' | 'MIXTO'

export const PERMISOS_M4 = {
  consultar: 'M4_CONSULTAR',
  competenciaGestionar: 'M4_COMPETENCIA_GESTIONAR',
  inscripcionGestionar: 'M4_INSCRIPCION_GESTIONAR',
  resultadoRegistrar: 'M4_RESULTADO_REGISTRAR',
  resultadoConsultar: 'M4_RESULTADO_CONSULTAR',
  resultadoAdministrar: 'M4_RESULTADO_ADMINISTRAR',
  resultadoPublicar: 'M4_RESULTADO_PUBLICAR',
} as const

export interface CategoriaM4 { id:number; nombre:string; genero:GeneroPrueba }
export interface PruebaM4 {
  id:number; competenciaId:number; modalidad:ModalidadPrueba; distanciaMetros:number; descripcion:string|null
  categorias:{categoriaId:number;categoria:string;genero:GeneroPrueba}[]
}
export interface CompetenciaM4 {
  id:number; nombre:string; fechaHora:string; lugar:string; tipo:TipoCompetencia; estado:EstadoCompetencia
  aperturaInscripciones:string; cierreInscripciones:string; totalPruebas?:number; inscripcionesAprobadas?:number
  pruebas?:PruebaM4[]
}
export interface ElegibleM4 { id:number; nombre:string; edad:number; categoria:string; preseleccionado:boolean }
export interface ValidacionM4 { tipo:string; aprobada:boolean; detalle:string }
export interface ResultadoInscripcionM4 { id:number; estado:'APROBADA'|'RECHAZADA'; validaciones:ValidacionM4[] }
export interface ParticipanteM4 {
  inscripcionId:number; patinadorId:number; patinador:string; categoria:string; resultadoId:number|null
  tiempoMs:number|null; noFinalizo:boolean|null; observaciones:string|null
}
export interface FilaResultadoM4 {
  resultadoId:number|null; patinador:string; categoria:string; tiempoMs:number|null; noFinalizo:boolean; puntos:number; puesto:number|null
}
export interface FilaRankingM4 {
  patinadorId:number; patinador:string; categoria:string|null; nivel:string|null; puntos:number; competencias:number; puesto:number
}
export interface RendimientoM4 {
  historial:{competencia:string;fecha:string;modalidad:string;distancia:number;tiempoMs:number|null;noFinalizo:boolean;puesto:number|null;puntos:number}[]
  records:{pruebaId:number;modalidad:string;distancia:number;recordMs:number}[]
}

export interface CorreccionM4 {
  id:number; tiempoAnteriorMs:number|null; tiempoNuevoMs:number|null;
  noFinalizoAnterior:boolean; noFinalizoNuevo:boolean; motivo:string; corregidoEn:string; corregidoPor:string|null;
}
