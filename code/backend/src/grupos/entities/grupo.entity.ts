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

export interface Horario {
  id: string;
  dia: DiaSemana;
  horaInicio: string; // Formato HH:mm (ej. "14:00")
  horaFin: string; // Formato HH:mm (ej. "16:00")
  pista: string;
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
