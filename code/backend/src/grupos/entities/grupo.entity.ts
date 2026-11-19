import type {
  EstadoPlanCarteraG4,
  PerfilDeportivoEstudianteM2,
  PolizaDeportivaM1,
  RegistroNotificacionM1,
  ValidacionMenorEdadM1,
} from '../../external-dependencies/interfaces/external-dependencies.interfaces.js';

export type CategoriaPatinaje =
  | 'Iniciacion'
  | 'Transicion'
  | 'Intermedio'
  | 'Avanzado'
  | 'Elite';

export type DiaSemana =
  | 'Lunes'
  | 'Martes'
  | 'Miercoles'
  | 'Jueves'
  | 'Viernes'
  | 'Sabado'
  | 'Domingo';

export type EstadoCupoGrupo = 'con-cupo' | 'alerta-90' | 'lleno';

export type RolDocenteGrupo = 'TITULAR' | 'ASISTENTE';

export type EstadoHorarioM3 = 'ACTIVO' | 'REPROGRAMADO' | 'CANCELADO';

export type EstadoInscripcionGrupoM3 = 'ACTIVO' | 'RETIRADO_CAMBIO';

/**
 * Contrato oficial API-M3-04 (GET /api/v1/grupos/{id}/estudiantes)
 * Respuesta JSON Base: [{ estudianteId, fechaInscripcion, estado }]
 */
export interface InscripcionEstudianteGrupoM3 {
  estudianteId: string;
  nombreEstudiante: string;
  grupoId: string;
  nombreGrupo: string;
  fechaInscripcion: string; // ISO 8601: YYYY-MM-DDTHH:mm:ssZ
  estado: EstadoInscripcionGrupoM3;
}

export interface ContextoAutogestionGrupoM3 {
  estudianteId: string;
  actorRol: 'ESTUDIANTE' | 'ACUDIENTE';
  actorId: string;
  perfilDeportivo: PerfilDeportivoEstudianteM2;
  validacionMenor: ValidacionMenorEdadM1;
  poliza: PolizaDeportivaM1;
  planCartera: EstadoPlanCarteraG4;
  puedeGestionarCambio: boolean;
  motivoBloqueoActor: string | null;
  grupoActual: Grupo | null;
  gruposElegibles: Grupo[];
}

export interface ResultadoCambioGrupoM3 {
  estudianteId: string;
  tipoOperacion: 'INSCRIPCION' | 'CAMBIO_GRUPO';
  grupoAnterior: Grupo | null;
  grupoNuevo: Grupo;
  inscripcion: InscripcionEstudianteGrupoM3;
  mensaje: string;
}

/**
 * Contrato oficial API-M3-03 (GET /api/v1/horarios)
 * Respuesta JSON Base: [{ horarioId, grupoId, diaSemana, horaInicio, horaFin, sedeId, estado }]
 * Mantiene además id, dia y pista para retrocompatibilidad.
 */
export interface Horario {
  id: string;
  horarioId?: string;
  grupoId?: string;
  nombreGrupo?: string;
  nivelNombre?: string;
  dia: DiaSemana;
  diaSemana?: DiaSemana;
  horaInicio: string; // Formato HH:mm (ej. "14:00")
  horaFin: string; // Formato HH:mm (ej. "16:00")
  sedeId?: string;
  sedeNombre?: string;
  pista: string;
  estado?: EstadoHorarioM3;
  motivoCancelacion?: string | null;
}

export interface RespuestaOperacionHorarioM3 {
  horario: Horario;
  notificacion: RegistroNotificacionM1 | null;
}

export interface ProfesorAsignadoGrupo {
  profesorId: string;
  nombreCompleto: string;
  rolDocente: RolDocenteGrupo;
  fechaAsignacion: string; // ISO 8601: YYYY-MM-DDTHH:mm:ssZ
}

/**
 * Contrato oficial API-M3-02 (GET /api/v1/profesores/{id}/grupos)
 * Respuesta JSON Base: [{ grupoId, nombreGrupo, rolDocente, horarios[] }]
 */
export interface GrupoAsignadoProfesorM3 {
  grupoId: string;
  nombreGrupo: string;
  rolDocente: RolDocenteGrupo;
  sedeNombre: string;
  nivelNombre: string;
  horarios: Horario[];
}

export interface EvaluacionDisponibilidadProfesorM3 {
  profesorId: string;
  nombreCompleto: string;
  especialidad: string;
  cargo: string;
  estadoContrato: string;
  disponible: boolean;
  tieneConflicto: boolean;
  yaAsignadoAlGrupo: boolean;
  detalleConflicto: string | null;
  gruposAsignados: GrupoAsignadoProfesorM3[];
}

/**
 * Contrato oficial API-M3-01 (GET /api/v1/grupos) enriquecido con metadatos
 * para el frontend del Módulo 3 y retrocompatibilidad con pruebas unitarias.
 */
export class Grupo {
  grupoId!: string;
  id!: string;
  nombre!: string;
  nivelId!: string;
  nivelNombre!: string;
  categoriaId!: string;
  categoriaNombre!: string;
  categoria!: CategoriaPatinaje;
  sedeId!: string;
  sedeNombre!: string;
  pista!: string;
  aforoMaximoFisicoSede!: number;
  dias!: DiaSemana[];
  aforoMax!: number;
  cupoMaximo!: number;
  ocupados!: number;
  inscritosActuales!: number;
  porcentajeOcupacion!: number;
  alerta90!: boolean;
  estadoCupo!: EstadoCupoGrupo;
  bloqueadoInscripcion!: boolean;
  profesorId!: string | null;
  profesorNombre!: string | null;
  profesoresAsignados!: ProfesorAsignadoGrupo[];
  horarios!: Horario[];
  activo!: boolean;
}
