/**
 * Tipos compartidos para el Módulo 3 (Grupos, Horarios y Programación - Grupo 2).
 * Alineados con API-M3-01 a API-M3-04 y las dependencias DEP-M1-01 a DEP-M6-01.
 */

export type DiaSemanaM3 =
  | 'Lunes'
  | 'Martes'
  | 'Miercoles'
  | 'Jueves'
  | 'Viernes'
  | 'Sabado'
  | 'Domingo'

export type EstadoCupoGrupoM3 = 'con-cupo' | 'alerta-90' | 'lleno'

export type RolDocenteGrupoM3 = 'TITULAR' | 'ASISTENTE'

export type EstadoHorarioM3 = 'ACTIVO' | 'REPROGRAMADO' | 'CANCELADO'

export type EstadoInscripcionGrupoM3 = 'ACTIVO' | 'RETIRADO_CAMBIO'

/**
 * Contrato oficial API-M3-04 (GET /api/v1/grupos/{id}/estudiantes)
 * Respuesta JSON Base: [{ estudianteId, fechaInscripcion, estado }]
 */
export interface InscripcionEstudianteGrupoM3 {
  estudianteId: string
  nombreEstudiante: string
  grupoId: string
  nombreGrupo: string
  fechaInscripcion: string // ISO 8601: YYYY-MM-DDTHH:mm:ssZ
  estado: EstadoInscripcionGrupoM3
}

export interface ContextoAutogestionGrupoM3 {
  estudianteId: string
  actorRol: 'ESTUDIANTE' | 'ACUDIENTE'
  actorId: string
  perfilDeportivo: {
    estudianteId: string
    nombreCompleto: string
    nivelId: string
    categoriaId: string
    estadoDeportivo: 'ACTIVO' | 'SUSPENDIDO' | 'INACTIVO'
  }
  validacionMenor: {
    estudianteId: string
    nombreEstudiante: string
    edad: number
    esMenorEdad: boolean
    acudienteId: string | null
    nombreAcudiente?: string | null
    tieneAutorizacion: boolean
  }
  poliza: {
    estudianteId: string
    polizaVigente: boolean
    fechaVencimiento: string
    numeroPoliza?: string
  }
  planCartera: {
    estudianteId: string
    nombrePlan: string
    planActivo: boolean
    alDiaEnPagos: boolean
    estadoCartera: 'AL_DIA' | 'PENDIENTE' | 'VENCIDO'
    limiteClasesSemanales: number
  }
  puedeGestionarCambio: boolean
  motivoBloqueoActor: string | null
  grupoActual: GrupoConfiguradoM3 | null
  gruposElegibles: GrupoConfiguradoM3[]
}

export interface ResultadoCambioGrupoM3 {
  estudianteId: string
  tipoOperacion: 'INSCRIPCION' | 'CAMBIO_GRUPO'
  grupoAnterior: GrupoConfiguradoM3 | null
  grupoNuevo: GrupoConfiguradoM3
  inscripcion: InscripcionEstudianteGrupoM3
  mensaje: string
}

/**
 * Contrato oficial API-M3-03 (GET /api/v1/horarios)
 * Respuesta JSON Base: [{ horarioId, grupoId, diaSemana, horaInicio, horaFin, sedeId, estado }]
 */
export interface HorarioGrupoM3 {
  id: string
  horarioId?: string
  grupoId?: string
  nombreGrupo?: string
  nivelNombre?: string
  dia: DiaSemanaM3
  diaSemana?: DiaSemanaM3
  horaInicio: string
  horaFin: string
  sedeId?: string
  sedeNombre?: string
  pista: string
  estado?: EstadoHorarioM3
  motivoCancelacion?: string | null
}

/** DEP-M1-05: Registro auditable de notificación enviada */
export interface RegistroNotificacionM1 {
  notificacionId: string
  destinatariosIds: string[]
  asunto: string
  mensaje: string
  canal: 'EMAIL_PUSH'
  fechaEnvio: string // ISO 8601: YYYY-MM-DDTHH:mm:ssZ
  estadoEnvio: 'ENVIADO'
}

export interface RespuestaOperacionHorarioM3 {
  horario: HorarioGrupoM3
  notificacion: RegistroNotificacionM1 | null
}

export interface ProfesorAsignadoGrupoM3 {
  profesorId: string
  nombreCompleto: string
  rolDocente: RolDocenteGrupoM3
  fechaAsignacion: string
}

/**
 * Contrato oficial API-M3-02 (GET /api/v1/profesores/{id}/grupos)
 * Respuesta JSON Base: [{ grupoId, nombreGrupo, rolDocente, horarios[] }]
 */
export interface GrupoAsignadoProfesorM3 {
  grupoId: string
  nombreGrupo: string
  rolDocente: RolDocenteGrupoM3
  sedeNombre?: string
  nivelNombre?: string
  horarios: HorarioGrupoM3[]
}

export interface EvaluacionDisponibilidadProfesorM3 {
  profesorId: string
  nombreCompleto: string
  especialidad: string
  cargo: string
  estadoContrato: string
  disponible: boolean
  tieneConflicto: boolean
  yaAsignadoAlGrupo: boolean
  detalleConflicto: string | null
  gruposAsignados: GrupoAsignadoProfesorM3[]
}

/** DEP-M2-01: Nivel técnico activo */
export interface NivelTecnicoM2 {
  nivelId: string
  nombre: string
  descripcion: string
  activo: boolean
}

/** DEP-M2-02: Categoría del club */
export interface CategoriaClubM2 {
  categoriaId: string
  nombre: string
  edadMin: number
  edadMax: number
}

/** DEP-G4-01: Sede/pista y capacidad física máxima */
export interface SedePistaG4 {
  sedeId: string
  nombreSede: string
  pista: string
  aforoMaximoFisico: number
}

/** API-M3-01: GET /api/v1/grupos */
export interface GrupoConfiguradoM3 {
  grupoId: string
  id: string
  nombre: string
  nivelId: string
  nivelNombre: string
  categoriaId: string
  categoriaNombre: string
  sedeId: string
  sedeNombre: string
  pista: string
  aforoMaximoFisicoSede: number
  dias: DiaSemanaM3[]
  aforoMax: number
  cupoMaximo: number
  ocupados: number
  inscritosActuales: number
  porcentajeOcupacion: number
  alerta90: boolean
  estadoCupo: EstadoCupoGrupoM3
  bloqueadoInscripcion: boolean
  profesorId: string | null
  profesorNombre: string | null
  profesoresAsignados?: ProfesorAsignadoGrupoM3[]
  horarios?: HorarioGrupoM3[]
  activo: boolean
}

export interface CrearGrupoM3Payload {
  nombre: string
  nivelId: string
  categoriaId: string
  sedeId: string
  dias: DiaSemanaM3[]
  aforoMax: number
  ocupados?: number
}

export interface CatalogosConfiguracionM3 {
  niveles: NivelTecnicoM2[]
  categorias: CategoriaClubM2[]
  sedes: SedePistaG4[]
  diasDisponibles: DiaSemanaM3[]
}

export const ETIQUETA_DIA_CORTO: Record<DiaSemanaM3, string> = {
  Lunes: 'Lun',
  Martes: 'Mar',
  Miercoles: 'Mié',
  Jueves: 'Jue',
  Viernes: 'Vie',
  Sabado: 'Sáb',
  Domingo: 'Dom',
}

export const ETIQUETA_DIA_COMPLETO: Record<DiaSemanaM3, string> = {
  Lunes: 'Lunes',
  Martes: 'Martes',
  Miercoles: 'Miércoles',
  Jueves: 'Jueves',
  Viernes: 'Viernes',
  Sabado: 'Sábado',
  Domingo: 'Domingo',
}

// Datos semilla de respaldo local (sincronizados con los adaptadores temporales de code/backend/)
export const CATALOGOS_M3_FALLBACK: CatalogosConfiguracionM3 = {
  niveles: [
    {
      nivelId: 'NIV-01',
      nombre: 'Iniciación',
      descripcion: 'Fundamentos de equilibrio, postura base, empuje inicial y frenado seguro',
      activo: true,
    },
    {
      nivelId: 'NIV-02',
      nombre: 'Transición',
      descripcion: 'Técnica de cruce en curva, postura baja y coordinación de braceo',
      activo: true,
    },
    {
      nivelId: 'NIV-03',
      nombre: 'Intermedio',
      descripcion: 'Rodaje en pelotón, series de resistencia y velocidad controlada en pista',
      activo: true,
    },
    {
      nivelId: 'NIV-04',
      nombre: 'Avanzado',
      descripcion: 'Velocidad de competencia, relevos, sprints de 200m/500m y fondo de 1000m',
      activo: true,
    },
    {
      nivelId: 'NIV-05',
      nombre: 'Élite',
      descripcion: 'Alto rendimiento competitivo para torneos distritales y nacionales',
      activo: true,
    },
  ],
  categorias: [
    { categoriaId: 'CAT-01', nombre: 'Semillero (5 a 7 años)', edadMin: 5, edadMax: 7 },
    { categoriaId: 'CAT-02', nombre: 'Infantil A (8 a 10 años)', edadMin: 8, edadMax: 10 },
    { categoriaId: 'CAT-03', nombre: 'Infantil B (11 a 13 años)', edadMin: 11, edadMax: 13 },
    { categoriaId: 'CAT-04', nombre: 'Juvenil (14 a 17 años)', edadMin: 14, edadMax: 17 },
    { categoriaId: 'CAT-05', nombre: 'Mayores (18+ años)', edadMin: 18, edadMax: 65 },
  ],
  sedes: [
    { sedeId: 'SEDE-NORTE-P1', nombreSede: 'Norte', pista: 'Pista 1 · Norte', aforoMaximoFisico: 25 },
    { sedeId: 'SEDE-SUR-P2', nombreSede: 'Sur', pista: 'Pista 2 · Sur', aforoMaximoFisico: 20 },
    {
      sedeId: 'SEDE-SALITRE-P1',
      nombreSede: 'El Salitre',
      pista: 'Pista Principal - El Salitre',
      aforoMaximoFisico: 30,
    },
  ],
  diasDisponibles: ['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado', 'Domingo'],
}

export const GRUPOS_M3_FALLBACK: GrupoConfiguradoM3[] = [
  {
    grupoId: 'GRP-01',
    id: 'GRP-01',
    nombre: 'Iniciación Norte A',
    nivelId: 'NIV-01',
    nivelNombre: 'Iniciación',
    categoriaId: 'CAT-02',
    categoriaNombre: 'Infantil A (8 a 10 años)',
    sedeId: 'SEDE-NORTE-P1',
    sedeNombre: 'Norte',
    pista: 'Pista 1 · Norte',
    aforoMaximoFisicoSede: 25,
    dias: ['Lunes', 'Miercoles'],
    aforoMax: 20,
    cupoMaximo: 20,
    ocupados: 12,
    inscritosActuales: 12,
    porcentajeOcupacion: 60,
    alerta90: false,
    estadoCupo: 'con-cupo',
    bloqueadoInscripcion: false,
    profesorId: 'PROF-01',
    profesorNombre: 'Carlos Mendoza',
    profesoresAsignados: [
      {
        profesorId: 'PROF-01',
        nombreCompleto: 'Carlos Mendoza',
        rolDocente: 'TITULAR',
        fechaAsignacion: '2026-09-23T08:00:00Z',
      },
    ],
    horarios: [
      {
        id: 'HOR-00',
        horarioId: 'HOR-00',
        grupoId: 'GRP-01',
        nombreGrupo: 'Iniciación Norte A',
        nivelNombre: 'Iniciación',
        dia: 'Lunes',
        diaSemana: 'Lunes',
        horaInicio: '14:00',
        horaFin: '16:00',
        sedeId: 'SEDE-NORTE-P1',
        sedeNombre: 'Norte',
        pista: 'Pista 1 · Norte',
        estado: 'ACTIVO',
      },
      {
        id: 'HOR-01',
        horarioId: 'HOR-01',
        grupoId: 'GRP-01',
        nombreGrupo: 'Iniciación Norte A',
        nivelNombre: 'Iniciación',
        dia: 'Martes',
        diaSemana: 'Martes',
        horaInicio: '15:00',
        horaFin: '17:00',
        sedeId: 'SEDE-SALITRE-P1',
        sedeNombre: 'El Salitre',
        pista: 'Pista Principal - El Salitre',
        estado: 'ACTIVO',
      },
      {
        id: 'HOR-06',
        horarioId: 'HOR-06',
        grupoId: 'GRP-01',
        nombreGrupo: 'Iniciación Norte A',
        nivelNombre: 'Iniciación',
        dia: 'Miercoles',
        diaSemana: 'Miercoles',
        horaInicio: '08:00',
        horaFin: '10:00',
        sedeId: 'SEDE-NORTE-P1',
        sedeNombre: 'Norte',
        pista: 'Pista 1 · Norte',
        estado: 'ACTIVO',
      },
    ],
    activo: true,
  },
  {
    grupoId: 'GRP-02',
    id: 'GRP-02',
    nombre: 'Intermedio Sur B',
    nivelId: 'NIV-03',
    nivelNombre: 'Intermedio',
    categoriaId: 'CAT-03',
    categoriaNombre: 'Infantil B (11 a 13 años)',
    sedeId: 'SEDE-SUR-P2',
    sedeNombre: 'Sur',
    pista: 'Pista 2 · Sur',
    aforoMaximoFisicoSede: 20,
    dias: ['Martes', 'Jueves'],
    aforoMax: 20,
    cupoMaximo: 20,
    ocupados: 18,
    inscritosActuales: 18,
    porcentajeOcupacion: 90,
    alerta90: true,
    estadoCupo: 'alerta-90',
    bloqueadoInscripcion: false,
    profesorId: 'PROF-03',
    profesorNombre: 'Ana Gómez',
    profesoresAsignados: [
      {
        profesorId: 'PROF-03',
        nombreCompleto: 'Ana Gómez',
        rolDocente: 'TITULAR',
        fechaAsignacion: '2026-09-23T08:30:00Z',
      },
      {
        profesorId: 'PROF-05',
        nombreCompleto: 'Carlos Díaz',
        rolDocente: 'ASISTENTE',
        fechaAsignacion: '2026-09-23T09:00:00Z',
      },
    ],
    horarios: [
      {
        id: 'HOR-02',
        horarioId: 'HOR-02',
        grupoId: 'GRP-02',
        nombreGrupo: 'Intermedio Sur B',
        nivelNombre: 'Intermedio',
        dia: 'Martes',
        diaSemana: 'Martes',
        horaInicio: '14:00',
        horaFin: '16:00',
        sedeId: 'SEDE-SUR-P2',
        sedeNombre: 'Sur',
        pista: 'Pista 2 · Sur',
        estado: 'ACTIVO',
      },
      {
        id: 'HOR-03',
        horarioId: 'HOR-03',
        grupoId: 'GRP-02',
        nombreGrupo: 'Intermedio Sur B',
        nivelNombre: 'Intermedio',
        dia: 'Jueves',
        diaSemana: 'Jueves',
        horaInicio: '14:00',
        horaFin: '16:00',
        sedeId: 'SEDE-SUR-P2',
        sedeNombre: 'Sur',
        pista: 'Pista 2 · Sur',
        estado: 'ACTIVO',
      },
    ],
    activo: true,
  },
  {
    grupoId: 'GRP-03',
    id: 'GRP-03',
    nombre: 'Avanzado Norte C',
    nivelId: 'NIV-04',
    nivelNombre: 'Avanzado',
    categoriaId: 'CAT-04',
    categoriaNombre: 'Juvenil (14 a 17 años)',
    sedeId: 'SEDE-NORTE-P1',
    sedeNombre: 'Norte',
    pista: 'Pista 1 · Norte',
    aforoMaximoFisicoSede: 25,
    dias: ['Viernes', 'Sabado'],
    aforoMax: 20,
    cupoMaximo: 20,
    ocupados: 20,
    inscritosActuales: 20,
    porcentajeOcupacion: 100,
    alerta90: true,
    estadoCupo: 'lleno',
    bloqueadoInscripcion: true,
    profesorId: 'PROF-04',
    profesorNombre: 'Luis Rojas',
    profesoresAsignados: [
      {
        profesorId: 'PROF-04',
        nombreCompleto: 'Luis Rojas',
        rolDocente: 'TITULAR',
        fechaAsignacion: '2026-09-23T10:00:00Z',
      },
    ],
    horarios: [
      {
        id: 'HOR-04',
        horarioId: 'HOR-04',
        grupoId: 'GRP-03',
        nombreGrupo: 'Avanzado Norte C',
        nivelNombre: 'Avanzado',
        dia: 'Viernes',
        diaSemana: 'Viernes',
        horaInicio: '14:00',
        horaFin: '16:00',
        sedeId: 'SEDE-NORTE-P1',
        sedeNombre: 'Norte',
        pista: 'Pista 1 · Norte',
        estado: 'ACTIVO',
      },
      {
        id: 'HOR-05',
        horarioId: 'HOR-05',
        grupoId: 'GRP-03',
        nombreGrupo: 'Avanzado Norte C',
        nivelNombre: 'Avanzado',
        dia: 'Sabado',
        diaSemana: 'Sabado',
        horaInicio: '08:00',
        horaFin: '10:00',
        sedeId: 'SEDE-NORTE-P1',
        sedeNombre: 'Norte',
        pista: 'Pista 1 · Norte',
        estado: 'ACTIVO',
      },
    ],
    activo: true,
  },
  {
    grupoId: 'GRP-04',
    id: 'GRP-04',
    nombre: 'Iniciación Norte B',
    nivelId: 'NIV-01',
    nivelNombre: 'Iniciación',
    categoriaId: 'CAT-02',
    categoriaNombre: 'Infantil A (8 a 10 años)',
    sedeId: 'SEDE-NORTE-P1',
    sedeNombre: 'Norte',
    pista: 'Pista 1 · Norte',
    aforoMaximoFisicoSede: 25,
    dias: ['Martes', 'Jueves'],
    aforoMax: 20,
    cupoMaximo: 20,
    ocupados: 9,
    inscritosActuales: 9,
    porcentajeOcupacion: 45,
    alerta90: false,
    estadoCupo: 'con-cupo',
    bloqueadoInscripcion: false,
    profesorId: 'PROF-01',
    profesorNombre: 'Carlos Mendoza',
    horarios: [
      {
        id: 'HOR-07',
        horarioId: 'HOR-07',
        grupoId: 'GRP-04',
        nombreGrupo: 'Iniciación Norte B',
        nivelNombre: 'Iniciación',
        dia: 'Martes',
        diaSemana: 'Martes',
        horaInicio: '16:00',
        horaFin: '18:00',
        sedeId: 'SEDE-NORTE-P1',
        sedeNombre: 'Norte',
        pista: 'Pista 1 · Norte',
        estado: 'ACTIVO',
      },
    ],
    activo: true,
  },
  {
    grupoId: 'GRP-05',
    id: 'GRP-05',
    nombre: 'Iniciación Sur A',
    nivelId: 'NIV-01',
    nivelNombre: 'Iniciación',
    categoriaId: 'CAT-02',
    categoriaNombre: 'Infantil A (8 a 10 años)',
    sedeId: 'SEDE-SUR-P2',
    sedeNombre: 'Sur',
    pista: 'Pista 2 · Sur',
    aforoMaximoFisicoSede: 20,
    dias: ['Lunes', 'Miercoles'],
    aforoMax: 20,
    cupoMaximo: 20,
    ocupados: 18,
    inscritosActuales: 18,
    porcentajeOcupacion: 90,
    alerta90: true,
    estadoCupo: 'alerta-90',
    bloqueadoInscripcion: false,
    profesorId: 'PROF-03',
    profesorNombre: 'Ana Gómez',
    horarios: [
      {
        id: 'HOR-09',
        horarioId: 'HOR-09',
        grupoId: 'GRP-05',
        nombreGrupo: 'Iniciación Sur A',
        nivelNombre: 'Iniciación',
        dia: 'Lunes',
        diaSemana: 'Lunes',
        horaInicio: '18:00',
        horaFin: '20:00',
        sedeId: 'SEDE-SUR-P2',
        sedeNombre: 'Sur',
        pista: 'Pista 2 · Sur',
        estado: 'ACTIVO',
      },
    ],
    activo: true,
  },
  {
    grupoId: 'GRP-06',
    id: 'GRP-06',
    nombre: 'Iniciación Norte C',
    nivelId: 'NIV-01',
    nivelNombre: 'Iniciación',
    categoriaId: 'CAT-02',
    categoriaNombre: 'Infantil A (8 a 10 años)',
    sedeId: 'SEDE-NORTE-P1',
    sedeNombre: 'Norte',
    pista: 'Pista 1 · Norte',
    aforoMaximoFisicoSede: 25,
    dias: ['Viernes', 'Sabado'],
    aforoMax: 20,
    cupoMaximo: 20,
    ocupados: 20,
    inscritosActuales: 20,
    porcentajeOcupacion: 100,
    alerta90: true,
    estadoCupo: 'lleno',
    bloqueadoInscripcion: true,
    profesorId: 'PROF-01',
    profesorNombre: 'Carlos Mendoza',
    horarios: [
      {
        id: 'HOR-10',
        horarioId: 'HOR-10',
        grupoId: 'GRP-06',
        nombreGrupo: 'Iniciación Norte C',
        nivelNombre: 'Iniciación',
        dia: 'Viernes',
        diaSemana: 'Viernes',
        horaInicio: '09:00',
        horaFin: '11:00',
        sedeId: 'SEDE-NORTE-P1',
        sedeNombre: 'Norte',
        pista: 'Pista 1 · Norte',
        estado: 'ACTIVO',
      },
    ],
    activo: true,
  },
]

export const PROFESORES_BASE_FALLBACK = [
  {
    profesorId: 'PROF-01',
    nombreCompleto: 'Carlos Mendoza',
    especialidad: 'Velocidad y Fondo',
    cargo: 'Entrenador Principal de Velocidad',
    estadoContrato: 'ACTIVO',
    bloquesOcupadosExternos: [] as {
      diaSemana: DiaSemanaM3
      horaInicio: string
      horaFin: string
      motivo: string
    }[],
  },
  {
    profesorId: 'PROF-02',
    nombreCompleto: 'Profesor Person',
    especialidad: 'Iniciación y Técnica de Curva',
    cargo: 'Entrenador de Iniciación (Profesor Person)',
    estadoContrato: 'ACTIVO',
    bloquesOcupadosExternos: [
      {
        diaSemana: 'Lunes' as DiaSemanaM3,
        horaInicio: '14:00',
        horaFin: '16:00',
        motivo: 'Clase programada de fundamentación técnica (Lunes 14:00)',
      },
      {
        diaSemana: 'Martes' as DiaSemanaM3,
        horaInicio: '14:00',
        horaFin: '16:00',
        motivo: 'Sesión técnica asignada (Martes 14:00)',
      },
    ],
  },
  {
    profesorId: 'PROF-03',
    nombreCompleto: 'Ana Gómez',
    especialidad: 'Transición e Intermedio',
    cargo: 'Entrenadora de Transición e Intermedio',
    estadoContrato: 'ACTIVO',
    bloquesOcupadosExternos: [],
  },
  {
    profesorId: 'PROF-04',
    nombreCompleto: 'Luis Rojas',
    especialidad: 'Velocidad Pura 200m/500m',
    cargo: 'Entrenador de Velocidad Pura',
    estadoContrato: 'ACTIVO',
    bloquesOcupadosExternos: [],
  },
  {
    profesorId: 'PROF-05',
    nombreCompleto: 'Carlos Díaz',
    especialidad: 'Preparación Física sobre Ruedas',
    cargo: 'Entrenador Asistente',
    estadoContrato: 'ACTIVO',
    bloquesOcupadosExternos: [],
  },
]
