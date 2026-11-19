/**
 * Tipos compartidos para el Módulo 3 (Grupos, Horarios y Programación - Grupo 2).
 * Alineados con API-M3-01 y las dependencias DEP-M2-01, DEP-M2-02 y DEP-G4-01.
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
    activo: true,
  },
]
