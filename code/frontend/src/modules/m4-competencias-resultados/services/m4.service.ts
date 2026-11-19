import { pedir } from '../../../shared/services/cliente-api.ts'
import type {
  CategoriaM4, CompetenciaM4, ElegibleM4, FilaRankingM4, FilaResultadoM4, ParticipanteM4,
  RendimientoM4, ResultadoInscripcionM4, CorreccionM4,
} from '../types/m4.types.ts'

export const listarCompetencias = (filtros:{estado?:string;buscar?:string}={}) =>
  pedir<CompetenciaM4[]>('/m4/competencias',{consulta:filtros})
export const detalleCompetencia = (id:number) => pedir<CompetenciaM4>(`/m4/competencias/${id}`)
export const listarCategorias = () => pedir<CategoriaM4[]>('/m4/categorias')
export const crearCompetencia = (datos:Omit<CompetenciaM4,'id'|'estado'>) =>
  pedir<CompetenciaM4>('/m4/competencias',{metodo:'POST',cuerpo:datos})
export const editarCompetencia = (id:number,datos:Partial<CompetenciaM4>) =>
  pedir<CompetenciaM4>(`/m4/competencias/${id}`,{metodo:'PATCH',cuerpo:datos})
export const publicarCompetencia = (id:number) =>
  pedir<CompetenciaM4>(`/m4/competencias/${id}/publicar`,{metodo:'POST'})
export const cancelarCompetencia = (id:number,motivo:string) =>
  pedir<CompetenciaM4>(`/m4/competencias/${id}/cancelar`,{metodo:'POST',cuerpo:{motivo}})
export const agregarPrueba = (datos:{competenciaId:number;modalidad:string;distanciaMetros:number;descripcion?:string;categoriaId:number;genero:string}) =>
  pedir<{id:number}>('/m4/pruebas',{metodo:'POST',cuerpo:datos})
export const listarElegibles = (id:number) => pedir<ElegibleM4[]>(`/m4/competencias/${id}/elegibles`)
export const preseleccionar = (competenciaId:number,patinadoresIds:number[]) =>
  pedir<{preseleccionados:number}>('/m4/preselecciones',{metodo:'POST',cuerpo:{competenciaId,patinadoresIds}})
export const solicitarInscripcion = (pruebaId:number,patinadorId:number,confirmarAutorizacionAcudiente:boolean) =>
  pedir<ResultadoInscripcionM4>('/m4/inscripciones',{metodo:'POST',cuerpo:{pruebaId,patinadorId,confirmarAutorizacionAcudiente}})
export const listarParticipantes = (id:number) => pedir<ParticipanteM4[]>(`/m4/pruebas/${id}/participantes`)
export const registrarResultado = (datos:{inscripcionId:number;tiempo?:string;noFinalizo:boolean;observaciones?:string}) =>
  pedir<{resultadoId:number;tabla:FilaResultadoM4[];recordPersonal:{nuevoRecord:boolean;mejorTiempoMs:number;marcaAnteriorMs:number|null;diferenciaMs:number|null}|null}>('/m4/resultados',{metodo:'POST',cuerpo:datos})
export const listarResultados = (id:number) => pedir<FilaResultadoM4[]>(`/m4/pruebas/${id}/resultados`)
export const consultarRanking = () => pedir<FilaRankingM4[]>('/m4/ranking')
export const consultarRendimiento = (id:number) => pedir<RendimientoM4>(`/m4/rendimiento/${id}`)
export const corregirResultado = (id:number,datos:{tiempo?:string;noFinalizo:boolean;motivo:string;observaciones?:string}) =>
  pedir<{resultadoId:number;tabla:FilaResultadoM4[]}>(`/m4/resultados/${id}/corregir`,{metodo:'PATCH',cuerpo:datos})
export const listarCorrecciones = (id:number) => pedir<CorreccionM4[]>(`/m4/resultados/${id}/auditoria`)
export const publicarResultados = (id:number) =>
  pedir<{competenciaId:number;estado:string;mensaje:string}>(`/m4/competencias/${id}/publicar-resultados`,{metodo:'POST'})
