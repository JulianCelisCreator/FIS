/**
 * Contratos (Puertos) de las 12 dependencias externas que consume el Módulo 3
 * (Grupos, Horarios y Programación - Grupo 2).
 *
 * Estándares del contrato de integración:
 * - Fechas y horas en formato ISO 8601 (YYYY-MM-DDTHH:mm:ssZ)
 * - Autenticación por cabecera JWT: Authorization: Bearer <token>
 */

export type RolExternoM1 = 'ADMIN' | 'PROFESOR' | 'ESTUDIANTE' | 'ACUDIENTE';

/** DEP-M1-01: Validar sesión activa y rol del usuario autenticado */
export interface SesionUsuarioM1 {
  userId: string;
  rol: RolExternoM1;
  activo: boolean;
  nombreCompleto?: string;
  estudianteVinculadoId?: string;
}

/** DEP-M1-02: Profesor activo disponible para asignación a grupos */
export interface ProfesorActivoM1 {
  profesorId: string;
  nombreCompleto: string;
  estado: 'ACTIVO' | 'INACTIVO';
  especialidad?: string;
}

/** DEP-M1-03: Validación de menor de edad y acudiente autorizado */
export interface ValidacionMenorEdadM1 {
  estudianteId: string;
  nombreEstudiante: string;
  edad: number;
  esMenorEdad: boolean;
  acudienteId: string | null;
  nombreAcudiente?: string | null;
  tieneAutorizacion: boolean;
}

/** DEP-M1-04: Validación de póliza médico-deportiva vigente */
export interface PolizaDeportivaM1 {
  estudianteId: string;
  polizaVigente: boolean;
  fechaVencimiento: string; // ISO 8601: YYYY-MM-DDTHH:mm:ssZ
  numeroPoliza?: string;
}

/** DEP-M1-05: Payload y registro auditable de notificación (Email / Push) */
export interface SolicitudNotificacionM1 {
  destinatariosIds: string[];
  asunto: string;
  mensaje: string;
}

export interface RegistroNotificacionM1 extends SolicitudNotificacionM1 {
  notificacionId: string;
  canal: 'EMAIL_PUSH';
  fechaEnvio: string; // ISO 8601: YYYY-MM-DDTHH:mm:ssZ
  estadoEnvio: 'ENVIADO';
}

/** DEP-M2-01: Catálogo de niveles técnicos activos */
export interface NivelTecnicoM2 {
  nivelId: string;
  nombre: string;
  descripcion: string;
  activo: boolean;
}

/** DEP-M2-02: Catálogo de categorías del club */
export interface CategoriaClubM2 {
  categoriaId: string;
  nombre: string;
  edadMin: number;
  edadMax: number;
}

/** DEP-M2-03: Perfil deportivo vigente de un estudiante */
export interface PerfilDeportivoEstudianteM2 {
  estudianteId: string;
  nombreCompleto: string;
  nivelId: string;
  categoriaId: string;
  estadoDeportivo: 'ACTIVO' | 'SUSPENDIDO' | 'INACTIVO';
}

/** DEP-G4-01: Sedes, pistas y capacidad física máxima */
export interface SedePistaG4 {
  sedeId: string;
  nombreSede: string;
  pista: string;
  aforoMaximoFisico: number;
}

/** DEP-G4-02: Estado del plan de pago y cartera del estudiante */
export interface EstadoPlanCarteraG4 {
  estudianteId: string;
  nombrePlan: string;
  planActivo: boolean;
  alDiaEnPagos: boolean;
  estadoCartera: 'AL_DIA' | 'PENDIENTE' | 'VENCIDO';
  limiteClasesSemanales: number;
}

/** DEP-M4-01: Competencias y eventos institucionales publicados */
export interface CompetenciaEventoM4 {
  competenciaId: string;
  titulo: string;
  fechaInicio: string; // ISO 8601: YYYY-MM-DDTHH:mm:ssZ
  fechaFin: string; // ISO 8601: YYYY-MM-DDTHH:mm:ssZ
  sedeId: string;
  categorias: string[];
  tipoEvento?: 'COMPETENCIA' | 'INSTITUCIONAL';
}

/** DEP-M6-01: Franja de disponibilidad laboral docente */
export interface FranjaDisponibilidadDocenteM6 {
  diaSemana:
    | 'Lunes'
    | 'Martes'
    | 'Miercoles'
    | 'Jueves'
    | 'Viernes'
    | 'Sabado'
    | 'Domingo';
  horaInicio: string; // HH:mm
  horaFin: string; // HH:mm
}

/** DEP-M6-01: Estado contractual y disponibilidad horaria docente */
export interface DisponibilidadPersonalM6 {
  personalId: string;
  cargo: string;
  estadoContrato: 'ACTIVO' | 'LICENCIA' | 'FINALIZADO';
  disponibilidad: FranjaDisponibilidadDocenteM6[];
  bloquesOcupadosExternos?: {
    diaSemana: FranjaDisponibilidadDocenteM6['diaSemana'];
    horaInicio: string;
    horaFin: string;
    motivo: string;
  }[];
}

// ============================================================================
// PUERTOS (INTERFACES DE ADAPTADORES) Y TOKENS DE INYECCIÓN
// ============================================================================

export const PUERTO_M1_USUARIOS = 'PUERTO_M1_USUARIOS';
export interface IPuertoM1Usuarios {
  /** DEP-M1-01 */
  validarSesion(authorizationHeader?: string): SesionUsuarioM1;
  listarSesionesDisponibles(): SesionUsuarioM1[];
  /** DEP-M1-02 */
  listarProfesoresActivos(): ProfesorActivoM1[];
  /** DEP-M1-03 */
  validarMenorYAcudiente(estudianteId: string): ValidacionMenorEdadM1;
  listarValidacionesMenores(): ValidacionMenorEdadM1[];
  /** DEP-M1-04 */
  validarPolizaVigente(estudianteId: string): PolizaDeportivaM1;
  /** DEP-M1-05 */
  enviarNotificacion(
    payload: SolicitudNotificacionM1,
  ): RegistroNotificacionM1;
  listarNotificacionesEnviadas(): RegistroNotificacionM1[];
}

export const PUERTO_M2_DEPORTIVO = 'PUERTO_M2_DEPORTIVO';
export interface IPuertoM2Deportivo {
  /** DEP-M2-01 */
  listarNivelesTecnicosActivos(): NivelTecnicoM2[];
  /** DEP-M2-02 */
  listarCategorias(): CategoriaClubM2[];
  /** DEP-M2-03 */
  obtenerPerfilDeportivo(estudianteId: string): PerfilDeportivoEstudianteM2;
  listarPerfilesDeportivos(): PerfilDeportivoEstudianteM2[];
}

export const PUERTO_G4_SEDES_CARTERA = 'PUERTO_G4_SEDES_CARTERA';
export interface IPuertoG4SedesCartera {
  /** DEP-G4-01 */
  listarSedesYPistas(): SedePistaG4[];
  obtenerSedePorId(sedeId: string): SedePistaG4 | undefined;
  /** DEP-G4-02 */
  obtenerEstadoPlanYCartera(estudianteId: string): EstadoPlanCarteraG4;
  listarEstadosPlanYCartera(): EstadoPlanCarteraG4[];
}

export const PUERTO_M4_COMPETENCIAS = 'PUERTO_M4_COMPETENCIAS';
export interface IPuertoM4Competencias {
  /** DEP-M4-01 */
  listarCompetenciasPublicadas(
    fechaInicio?: string,
    fechaFin?: string,
  ): CompetenciaEventoM4[];
}

export const PUERTO_M6_PERSONAL = 'PUERTO_M6_PERSONAL';
export interface IPuertoM6Personal {
  /** DEP-M6-01 */
  obtenerDisponibilidadDocente(
    personalId: string,
  ): DisponibilidadPersonalM6 | undefined;
  listarDisponibilidadesDocentes(): DisponibilidadPersonalM6[];
}
