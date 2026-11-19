import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { G4SedesCarteraMockAdapter } from '../external-dependencies/adapters/g4-sedes-cartera.mock.adapter.js';
import { M1UsuariosMockAdapter } from '../external-dependencies/adapters/m1-usuarios.mock.adapter.js';
import { M2DeportivoMockAdapter } from '../external-dependencies/adapters/m2-deportivo.mock.adapter.js';
import { M4CompetenciasMockAdapter } from '../external-dependencies/adapters/m4-competencias.mock.adapter.js';
import { M6PersonalMockAdapter } from '../external-dependencies/adapters/m6-personal.mock.adapter.js';
import {
  type IPuertoG4SedesCartera,
  type IPuertoM1Usuarios,
  type IPuertoM2Deportivo,
  type IPuertoM4Competencias,
  type IPuertoM6Personal,
  PUERTO_G4_SEDES_CARTERA,
  PUERTO_M1_USUARIOS,
  PUERTO_M2_DEPORTIVO,
  PUERTO_M4_COMPETENCIAS,
  PUERTO_M6_PERSONAL,
  type RegistroNotificacionM1,
} from '../external-dependencies/interfaces/external-dependencies.interfaces.js';
import {
  AsignarProfesorDto,
  AsignarProfesoresMultipleDto,
  CreateGrupoDto,
  InscribirCambiarGrupoDto,
  UpdateGrupoDto,
} from './dto/create-grupo.dto.js';
import {
  ActualizarEventoGlobalDto,
  CancelarHorarioDto,
  CrearEventoGlobalDto,
  CreateHorarioDto,
  UpdateHorarioDto,
} from './dto/create-horario.dto.js';
import {
  type CategoriaPatinaje,
  type ContextoAutogestionGrupoM3,
  type DiaSemana,
  type EstadoCupoGrupo,
  type EvaluacionDisponibilidadProfesorM3,
  type EventoCalendarioM3,
  Grupo,
  type GrupoAsignadoProfesorM3,
  type Horario,
  type InscripcionEstudianteGrupoM3,
  type ProfesorAsignadoGrupo,
  type RespuestaCalendarioConsolidadoM3,
  type RespuestaOperacionHorarioM3,
  type ResultadoCambioGrupoM3,
  type RolDocenteGrupo,
} from './entities/grupo.entity.js';

const DIAS_VALIDOS: DiaSemana[] = [
  'Lunes',
  'Martes',
  'Miercoles',
  'Jueves',
  'Viernes',
  'Sabado',
  'Domingo',
];

const FECHAS_OCTUBRE_POR_DIA: Record<DiaSemana, string[]> = {
  Lunes: ['2026-10-05', '2026-10-12', '2026-10-19', '2026-10-26'],
  Martes: ['2026-10-06', '2026-10-13', '2026-10-20', '2026-10-27'],
  Miercoles: ['2026-10-07', '2026-10-14', '2026-10-21', '2026-10-28'],
  Jueves: ['2026-10-08', '2026-10-15', '2026-10-22', '2026-10-29'],
  Viernes: ['2026-10-09', '2026-10-16', '2026-10-23', '2026-10-30'],
  Sabado: ['2026-10-10', '2026-10-17', '2026-10-24', '2026-10-31'],
  Domingo: ['2026-10-11', '2026-10-18', '2026-10-25'],
};

@Injectable()
export class GruposService {
  private readonly puertoM1: IPuertoM1Usuarios;
  private readonly puertoM2: IPuertoM2Deportivo;
  private readonly puertoG4: IPuertoG4SedesCartera;
  private readonly puertoM4: IPuertoM4Competencias;
  private readonly puertoM6: IPuertoM6Personal;

  private grupos: Grupo[] = [];
  private contadorHorarios = 10;
  private inscripcionesEstudiantes: InscripcionEstudianteGrupoM3[] = [];
  private eventosGlobalesClub: EventoCalendarioM3[] = [];

  constructor(
    @Optional()
    @Inject(PUERTO_M1_USUARIOS)
    puertoM1?: IPuertoM1Usuarios,
    @Optional()
    @Inject(PUERTO_M2_DEPORTIVO)
    puertoM2?: IPuertoM2Deportivo,
    @Optional()
    @Inject(PUERTO_G4_SEDES_CARTERA)
    puertoG4?: IPuertoG4SedesCartera,
    @Optional()
    @Inject(PUERTO_M6_PERSONAL)
    puertoM6?: IPuertoM6Personal,
    @Optional()
    @Inject(PUERTO_M4_COMPETENCIAS)
    puertoM4?: IPuertoM4Competencias,
  ) {
    this.puertoM1 = puertoM1 ?? new M1UsuariosMockAdapter();
    this.puertoM2 = puertoM2 ?? new M2DeportivoMockAdapter();
    this.puertoG4 = puertoG4 ?? new G4SedesCarteraMockAdapter();
    this.puertoM6 = puertoM6 ?? new M6PersonalMockAdapter();
    this.puertoM4 = puertoM4 ?? new M4CompetenciasMockAdapter();

    this.grupos = [
      this.construirGrupo({
        grupoId: 'GRP-01',
        nombre: 'Iniciación Norte A',
        nivelId: 'NIV-01',
        categoriaId: 'CAT-02',
        sedeId: 'SEDE-NORTE-P1',
        dias: ['Lunes', 'Miercoles'],
        aforoMax: 20,
        ocupados: 12,
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
      }),
      this.construirGrupo({
        grupoId: 'GRP-02',
        nombre: 'Intermedio Sur B',
        nivelId: 'NIV-03',
        categoriaId: 'CAT-03',
        sedeId: 'SEDE-SUR-P2',
        dias: ['Martes', 'Jueves'],
        aforoMax: 20,
        ocupados: 18,
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
      }),
      this.construirGrupo({
        grupoId: 'GRP-03',
        nombre: 'Avanzado Norte C',
        nivelId: 'NIV-04',
        categoriaId: 'CAT-04',
        sedeId: 'SEDE-NORTE-P1',
        dias: ['Viernes', 'Sabado'],
        aforoMax: 20,
        ocupados: 20,
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
      }),
      this.construirGrupo({
        grupoId: 'GRP-04',
        nombre: 'Iniciación Norte B',
        nivelId: 'NIV-01',
        categoriaId: 'CAT-02',
        sedeId: 'SEDE-NORTE-P1',
        dias: ['Martes', 'Jueves'],
        aforoMax: 20,
        ocupados: 9,
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
          {
            id: 'HOR-08',
            horarioId: 'HOR-08',
            grupoId: 'GRP-04',
            nombreGrupo: 'Iniciación Norte B',
            nivelNombre: 'Iniciación',
            dia: 'Jueves',
            diaSemana: 'Jueves',
            horaInicio: '16:00',
            horaFin: '18:00',
            sedeId: 'SEDE-NORTE-P1',
            sedeNombre: 'Norte',
            pista: 'Pista 1 · Norte',
            estado: 'ACTIVO',
          },
        ],
        activo: true,
      }),
      this.construirGrupo({
        grupoId: 'GRP-05',
        nombre: 'Iniciación Sur A',
        nivelId: 'NIV-01',
        categoriaId: 'CAT-02',
        sedeId: 'SEDE-SUR-P2',
        dias: ['Lunes', 'Miercoles'],
        aforoMax: 20,
        ocupados: 18,
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
      }),
      this.construirGrupo({
        grupoId: 'GRP-06',
        nombre: 'Iniciación Norte C',
        nivelId: 'NIV-01',
        categoriaId: 'CAT-02',
        sedeId: 'SEDE-NORTE-P1',
        dias: ['Viernes', 'Sabado'],
        aforoMax: 20,
        ocupados: 20,
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
      }),
    ];

    this.inscripcionesEstudiantes = [
      {
        estudianteId: 'EST-01',
        nombreEstudiante: 'Sofía Ramírez',
        grupoId: 'GRP-01',
        nombreGrupo: 'Iniciación Norte A',
        fechaInscripcion: '2026-09-23T14:00:00Z',
        estado: 'ACTIVO',
      },
      {
        estudianteId: 'EST-03',
        nombreEstudiante: 'Mateo Valderrama',
        grupoId: 'GRP-01',
        nombreGrupo: 'Iniciación Norte A',
        fechaInscripcion: '2026-09-25T10:30:00Z',
        estado: 'ACTIVO',
      },
      {
        estudianteId: 'EST-04',
        nombreEstudiante: 'Valentina Torres',
        grupoId: 'GRP-04',
        nombreGrupo: 'Iniciación Norte B',
        fechaInscripcion: '2026-09-26T09:15:00Z',
        estado: 'ACTIVO',
      },
    ];

    this.eventosGlobalesClub = [
      {
        eventoId: 'EVT-INST-01',
        tipo: 'EVENTO_INSTITUCIONAL',
        titulo: 'Festivo · Jornada Institucional de Mantenimiento',
        inicio: '2026-10-12T08:00:00Z',
        fin: '2026-10-12T18:00:00Z',
        ubicacion: 'Todas las sedes (Norte, Sur y El Salitre)',
        sedeId: 'SEDE-NORTE-P1',
        grupoId: null,
        nombreGrupo: 'Todos los grupos del club',
        categorias: ['Todas las categorías'],
        descripcion:
          'Fecha institucional de cierre de pistas por día festivo y revisión de seguridad.',
        estado: 'PROGRAMADO',
        editablePorAdmin: true,
      },
      {
        eventoId: 'EVT-INST-02',
        tipo: 'EVENTO_INSTITUCIONAL',
        titulo: 'Reunión General de Acudientes y Entrega de Uniformes',
        inicio: '2026-10-15T17:00:00Z',
        fin: '2026-10-15T19:00:00Z',
        ubicacion: 'Auditorio Principal · Sede Norte',
        sedeId: 'SEDE-NORTE-P1',
        grupoId: null,
        nombreGrupo: 'Todos los grupos del club',
        categorias: ['Todas las categorías'],
        descripcion:
          'Socialización del reglamento técnico de competencias y entrega de indumentaria.',
        estado: 'PROGRAMADO',
        editablePorAdmin: true,
      },
    ];
  }

  calcularMetricasAforo(ocupados: number, aforoMax: number): {
    alerta90: boolean;
    estadoCupo: EstadoCupoGrupo;
    porcentajeOcupacion: number;
    bloqueadoInscripcion: boolean;
  } {
    const alerta90 = ocupados * 100 >= aforoMax * 90;
    const bloqueadoInscripcion = ocupados >= aforoMax;
    const estadoCupo: EstadoCupoGrupo = bloqueadoInscripcion
      ? 'lleno'
      : alerta90
        ? 'alerta-90'
        : 'con-cupo';
    const porcentajeOcupacion = Math.min(
      100,
      Math.round((ocupados * 100) / aforoMax),
    );
    return {
      alerta90,
      estadoCupo,
      porcentajeOcupacion,
      bloqueadoInscripcion,
    };
  }

  private mapearNivelACategoriaLegacy(nombreNivel: string): CategoriaPatinaje {
    const limpio = nombreNivel
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
    if (limpio.includes('transicion')) return 'Transicion';
    if (limpio.includes('intermedio')) return 'Intermedio';
    if (limpio.includes('avanzado')) return 'Avanzado';
    if (limpio.includes('elite')) return 'Elite';
    return 'Iniciacion';
  }

  private resolverNivel(nivelIdOCategoria?: string) {
    const niveles = this.puertoM2.listarNivelesTecnicosActivos();
    if (!nivelIdOCategoria) return undefined;
    const normalizado = nivelIdOCategoria
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
    return niveles.find(
      (n) =>
        n.nivelId.toLowerCase() === normalizado ||
        n.nombre
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLowerCase() === normalizado,
    );
  }

  private resolverCategoria(categoriaId?: string) {
    const categorias = this.puertoM2.listarCategorias();
    if (!categoriaId) return categorias[1] ?? categorias[0];
    return categorias.find(
      (c) =>
        c.categoriaId.toLowerCase() === categoriaId.toLowerCase() ||
        c.nombre.toLowerCase().includes(categoriaId.toLowerCase()),
    );
  }

  private resolverSedePorIdOPista(sedeIdOPista?: string, fallbackSedeId?: string) {
    const sedes = this.puertoG4.listarSedesYPistas();
    if (sedeIdOPista) {
      const encontrada = sedes.find(
        (s) =>
          s.sedeId.toLowerCase() === sedeIdOPista.toLowerCase() ||
          s.nombreSede.toLowerCase() === sedeIdOPista.toLowerCase() ||
          s.pista.toLowerCase() === sedeIdOPista.toLowerCase(),
      );
      if (encontrada) return encontrada;
    }
    if (fallbackSedeId) {
      const porFallback = this.puertoG4.obtenerSedePorId(fallbackSedeId);
      if (porFallback) return porFallback;
    }
    return sedes[0];
  }

  private construirGrupo(params: {
    grupoId: string;
    nombre: string;
    nivelId: string;
    categoriaId: string;
    sedeId: string;
    dias: DiaSemana[];
    aforoMax: number;
    ocupados: number;
    profesorId: string | null;
    profesorNombre: string | null;
    profesoresAsignados?: ProfesorAsignadoGrupo[];
    horarios: Horario[];
    activo: boolean;
  }): Grupo {
    const nivel =
      this.resolverNivel(params.nivelId) ??
      this.puertoM2.listarNivelesTecnicosActivos()[0];
    const categoriaClub =
      this.resolverCategoria(params.categoriaId) ??
      this.puertoM2.listarCategorias()[0];
    const sede =
      this.puertoG4.obtenerSedePorId(params.sedeId) ??
      this.puertoG4.listarSedesYPistas()[0];
    const metricas = this.calcularMetricasAforo(
      params.ocupados,
      params.aforoMax,
    );

    const profesoresAsignados: ProfesorAsignadoGrupo[] =
      params.profesoresAsignados ??
      (params.profesorId && params.profesorNombre
        ? [
            {
              profesorId: params.profesorId,
              nombreCompleto: params.profesorNombre,
              rolDocente: 'TITULAR',
              fechaAsignacion: '2026-09-23T08:00:00Z',
            },
          ]
        : []);

    return {
      grupoId: params.grupoId,
      id: params.grupoId,
      nombre: params.nombre,
      nivelId: nivel.nivelId,
      nivelNombre: nivel.nombre,
      categoriaId: categoriaClub.categoriaId,
      categoriaNombre: categoriaClub.nombre,
      categoria: this.mapearNivelACategoriaLegacy(nivel.nombre),
      sedeId: sede.sedeId,
      sedeNombre: sede.nombreSede,
      pista: sede.pista,
      aforoMaximoFisicoSede: sede.aforoMaximoFisico,
      dias: params.dias,
      aforoMax: params.aforoMax,
      cupoMaximo: params.aforoMax,
      ocupados: params.ocupados,
      inscritosActuales: params.ocupados,
      porcentajeOcupacion: metricas.porcentajeOcupacion,
      alerta90: metricas.alerta90,
      estadoCupo: metricas.estadoCupo,
      bloqueadoInscripcion: metricas.bloqueadoInscripcion || !params.activo,
      profesorId: profesoresAsignados[0]?.profesorId ?? params.profesorId,
      profesorNombre:
        profesoresAsignados[0]?.nombreCompleto ?? params.profesorNombre,
      profesoresAsignados,
      horarios: params.horarios,
      activo: params.activo,
    };
  }

  private sincronizarMetricas(grupo: Grupo): Grupo {
    const metricas = this.calcularMetricasAforo(
      grupo.ocupados,
      grupo.aforoMax,
    );
    grupo.cupoMaximo = grupo.aforoMax;
    grupo.inscritosActuales = grupo.ocupados;
    grupo.alerta90 = metricas.alerta90;
    grupo.estadoCupo = metricas.estadoCupo;
    grupo.porcentajeOcupacion = metricas.porcentajeOcupacion;
    grupo.bloqueadoInscripcion = metricas.bloqueadoInscripcion || !grupo.activo;
    if (!Array.isArray(grupo.profesoresAsignados)) {
      grupo.profesoresAsignados =
        grupo.profesorId && grupo.profesorNombre
          ? [
              {
                profesorId: grupo.profesorId,
                nombreCompleto: grupo.profesorNombre,
                rolDocente: 'TITULAR',
                fechaAsignacion: '2026-09-23T08:00:00Z',
              },
            ]
          : [];
    }
    const titular =
      grupo.profesoresAsignados.find((p) => p.rolDocente === 'TITULAR') ??
      grupo.profesoresAsignados[0];
    grupo.profesorId = titular?.profesorId ?? null;
    grupo.profesorNombre = titular?.nombreCompleto ?? null;
    return grupo;
  }

  obtenerCatalogosConfiguracion(authorizationHeader?: string) {
    const sesion = this.puertoM1.validarSesion(authorizationHeader);
    return {
      sesion,
      niveles: this.puertoM2.listarNivelesTecnicosActivos(),
      categorias: this.puertoM2.listarCategorias(),
      sedes: this.puertoG4.listarSedesYPistas(),
      diasDisponibles: DIAS_VALIDOS,
    };
  }

  /**
   * API-M3-01: GET /api/v1/grupos
   */
  findAll(authorizationHeader?: string): Grupo[] {
    this.puertoM1.validarSesion(authorizationHeader);
    return this.grupos.map((g) => this.sincronizarMetricas(g));
  }

  findOne(id: string): Grupo {
    const grupo = this.grupos.find((g) => g.id === id || g.grupoId === id);
    if (!grupo) {
      throw new NotFoundException(`El grupo con ID ${id} no existe`);
    }
    return this.sincronizarMetricas(grupo);
  }

  create(createGrupoDto: CreateGrupoDto): Grupo {
    const nombre = createGrupoDto.nombre?.trim();
    if (!nombre) {
      throw new BadRequestException('El nombre del grupo es obligatorio');
    }

    const esLlamadaCompletaHU31 =
      createGrupoDto.nivelId !== undefined ||
      createGrupoDto.sedeId !== undefined ||
      createGrupoDto.dias !== undefined ||
      createGrupoDto.aforoMax !== undefined;

    const nivelEntrada = createGrupoDto.nivelId ?? createGrupoDto.categoria;
    if (!nivelEntrada || !String(nivelEntrada).trim()) {
      throw new BadRequestException(
        'El nivel técnico es obligatorio para crear un grupo',
      );
    }
    const nivel = this.resolverNivel(nivelEntrada);
    if (!nivel) {
      throw new BadRequestException(
        `El nivel técnico '${nivelEntrada}' no existe o no está activo en DEP-M2-01`,
      );
    }

    if (esLlamadaCompletaHU31 && !createGrupoDto.sedeId?.trim()) {
      throw new BadRequestException('La sede es obligatoria para crear un grupo');
    }
    const sedeEntrada = createGrupoDto.sedeId ?? 'SEDE-NORTE-P1';
    const sede = this.puertoG4.obtenerSedePorId(sedeEntrada);
    if (!sede) {
      throw new BadRequestException(
        `La sede '${sedeEntrada}' no existe en el catálogo de sedes (DEP-G4-01)`,
      );
    }

    const categoria = this.resolverCategoria(createGrupoDto.categoriaId);
    if (!categoria) {
      throw new BadRequestException(
        `La categoría '${createGrupoDto.categoriaId}' no existe en DEP-M2-02`,
      );
    }

    if (
      esLlamadaCompletaHU31 &&
      (!Array.isArray(createGrupoDto.dias) || createGrupoDto.dias.length === 0)
    ) {
      throw new BadRequestException(
        'Debe seleccionar al menos un día de clase para el grupo',
      );
    }
    const dias: DiaSemana[] =
      createGrupoDto.dias && createGrupoDto.dias.length > 0
        ? createGrupoDto.dias
        : ['Lunes', 'Miercoles'];

    const diaInvalido = dias.find((d) => !DIAS_VALIDOS.includes(d));
    if (diaInvalido) {
      throw new BadRequestException(
        `El día '${diaInvalido}' no es un día de la semana válido`,
      );
    }

    const aforoMax = createGrupoDto.aforoMax ?? createGrupoDto.cupoMaximo;
    if (aforoMax === undefined || aforoMax === null || aforoMax <= 0) {
      throw new BadRequestException('El cupo maximo debe ser mayor a 0');
    }

    if (aforoMax > sede.aforoMaximoFisico) {
      throw new BadRequestException(
        `El cupo máximo (${aforoMax}) excede la capacidad física máxima de la sede ${sede.nombreSede} - ${sede.pista} (${sede.aforoMaximoFisico} patinadores según DEP-G4-01)`,
      );
    }

    const ocupadosInicial = createGrupoDto.ocupados ?? 0;
    if (ocupadosInicial < 0 || ocupadosInicial > aforoMax) {
      throw new BadRequestException(
        `El número de ocupados (${ocupadosInicial}) debe estar entre 0 y el cupo máximo (${aforoMax})`,
      );
    }

    const consecutivo = String(this.grupos.length + 1).padStart(2, '0');
    const nuevoGrupo = this.construirGrupo({
      grupoId: `GRP-${consecutivo}`,
      nombre,
      nivelId: nivel.nivelId,
      categoriaId: categoria.categoriaId,
      sedeId: sede.sedeId,
      dias,
      aforoMax,
      ocupados: ocupadosInicial,
      profesorId: null,
      profesorNombre: null,
      profesoresAsignados: [],
      horarios: [],
      activo: true,
    });

    this.grupos.push(nuevoGrupo);
    return nuevoGrupo;
  }

  actualizar(id: string, dto: UpdateGrupoDto): Grupo {
    const grupo = this.findOne(id);

    if (dto.nombre !== undefined) {
      const nombreLimpio = dto.nombre.trim();
      if (!nombreLimpio) {
        throw new BadRequestException('El nombre del grupo no puede estar vacío');
      }
      grupo.nombre = nombreLimpio;
    }

    if (dto.nivelId !== undefined) {
      const nivel = this.resolverNivel(dto.nivelId);
      if (!nivel) {
        throw new BadRequestException(
          `El nivel técnico '${dto.nivelId}' no existe en DEP-M2-01`,
        );
      }
      grupo.nivelId = nivel.nivelId;
      grupo.nivelNombre = nivel.nombre;
      grupo.categoria = this.mapearNivelACategoriaLegacy(nivel.nombre);
    }

    if (dto.categoriaId !== undefined) {
      const categoria = this.resolverCategoria(dto.categoriaId);
      if (!categoria) {
        throw new BadRequestException(
          `La categoría '${dto.categoriaId}' no existe en DEP-M2-02`,
        );
      }
      grupo.categoriaId = categoria.categoriaId;
      grupo.categoriaNombre = categoria.nombre;
    }

    const sedeObjetivo = dto.sedeId
      ? this.puertoG4.obtenerSedePorId(dto.sedeId)
      : this.puertoG4.obtenerSedePorId(grupo.sedeId);

    if (!sedeObjetivo) {
      throw new BadRequestException(
        `La sede '${dto.sedeId}' no existe en DEP-G4-01`,
      );
    }

    const nuevoAforoMax = dto.aforoMax ?? grupo.aforoMax;
    const nuevosOcupados = dto.ocupados ?? grupo.ocupados;

    if (nuevoAforoMax <= 0) {
      throw new BadRequestException('El cupo maximo debe ser mayor a 0');
    }

    if (nuevoAforoMax > sedeObjetivo.aforoMaximoFisico) {
      throw new BadRequestException(
        `El cupo máximo (${nuevoAforoMax}) excede la capacidad física máxima de la sede ${sedeObjetivo.nombreSede} (${sedeObjetivo.aforoMaximoFisico} patinadores según DEP-G4-01)`,
      );
    }

    if (nuevosOcupados < 0 || nuevosOcupados > nuevoAforoMax) {
      throw new BadRequestException(
        `El cupo máximo (${nuevoAforoMax}) no puede ser menor que los cupos actualmente ocupados (${nuevosOcupados})`,
      );
    }

    if (dto.dias !== undefined) {
      if (!Array.isArray(dto.dias) || dto.dias.length === 0) {
        throw new BadRequestException(
          'Debe seleccionar al menos un día de clase',
        );
      }
      grupo.dias = dto.dias;
    }

    grupo.sedeId = sedeObjetivo.sedeId;
    grupo.sedeNombre = sedeObjetivo.nombreSede;
    grupo.pista = sedeObjetivo.pista;
    grupo.aforoMaximoFisicoSede = sedeObjetivo.aforoMaximoFisico;
    grupo.aforoMax = nuevoAforoMax;
    grupo.ocupados = nuevosOcupados;

    return this.sincronizarMetricas(grupo);
  }

  cambiarEstado(id: string, activo: boolean): Grupo {
    const grupo = this.findOne(id);
    grupo.activo = activo;
    return this.sincronizarMetricas(grupo);
  }

  registrarInscripcionEnGrupo(grupoId: string): Grupo {
    const grupo = this.findOne(grupoId);
    if (!grupo.activo) {
      throw new BadRequestException(
        `El grupo ${grupo.nombre} se encuentra desactivado y no admite inscripciones`,
      );
    }
    if (grupo.ocupados >= grupo.aforoMax) {
      throw new BadRequestException(
        `No hay cupos disponibles en el grupo ${grupo.nombre} (${grupo.ocupados}/${grupo.aforoMax} · 100% de capacidad alcanzada)`,
      );
    }
    grupo.ocupados += 1;
    return this.sincronizarMetricas(grupo);
  }

  // ==========================================================================
  // HU-3.2: ASIGNACIÓN DE PROFESORES Y VALIDACIÓN DE CONFLICTOS DE HORARIO
  // ==========================================================================

  private profesorPerteneceAGrupo(grupo: Grupo, profesorId: string): boolean {
    return (
      grupo.profesorId === profesorId ||
      grupo.profesoresAsignados.some((p) => p.profesorId === profesorId)
    );
  }

  private horariosActivosDelGrupo(grupo: Grupo): Horario[] {
    return grupo.horarios.filter((h) => h.estado !== 'CANCELADO');
  }

  evaluarConflictoHorarioProfesor(
    grupo: Grupo,
    profesorId: string,
    nombreFallback?: string,
  ): string | null {
    const profM1 = this.puertoM1
      .listarProfesoresActivos()
      .find((p) => p.profesorId === profesorId);
    const nombreProfesor =
      profM1?.nombreCompleto ?? nombreFallback ?? profesorId;

    const infoPersonalM6 =
      this.puertoM6.obtenerDisponibilidadDocente(profesorId);

    if (infoPersonalM6 && infoPersonalM6.estadoContrato !== 'ACTIVO') {
      return `El profesor ${nombreProfesor} no tiene un contrato activo en DEP-M6-01 (estado: ${infoPersonalM6.estadoContrato}).`;
    }

    const horariosGrupo = this.horariosActivosDelGrupo(grupo);

    if (infoPersonalM6) {
      for (const hActual of horariosGrupo) {
        const conflictoExterno = infoPersonalM6.bloquesOcupadosExternos?.find(
          (bloque) =>
            bloque.diaSemana === hActual.dia &&
            hActual.horaInicio < bloque.horaFin &&
            hActual.horaFin > bloque.horaInicio,
        );
        if (conflictoExterno) {
          return `${nombreProfesor} ya tiene clase programada los ${hActual.dia.toLowerCase()} a las ${conflictoExterno.horaInicio} (${conflictoExterno.motivo}). Seleccione otro docente o franja.`;
        }

        const dentroDeJornada = infoPersonalM6.disponibilidad.some(
          (disp) =>
            disp.diaSemana === hActual.dia &&
            hActual.horaInicio >= disp.horaInicio &&
            hActual.horaFin <= disp.horaFin,
        );
        if (!dentroDeJornada) {
          return `${nombreProfesor} no cuenta con disponibilidad laboral registrada en DEP-M6-01 para el día ${hActual.dia} (${hActual.horaInicio}–${hActual.horaFin}).`;
        }
      }
    }

    const otrosGruposDelProfesor = this.grupos.filter(
      (g) =>
        g.activo &&
        g.grupoId !== grupo.grupoId &&
        this.profesorPerteneceAGrupo(g, profesorId),
    );

    for (const otroGrupo of otrosGruposDelProfesor) {
      for (const hActual of horariosGrupo) {
        const cruce = this.horariosActivosDelGrupo(otroGrupo).find(
          (hOtro) =>
            hOtro.dia === hActual.dia &&
            hActual.horaInicio < hOtro.horaFin &&
            hActual.horaFin > hOtro.horaInicio,
        );
        if (cruce) {
          return `El profesor ${nombreProfesor} ya tiene clase asignada en «${otroGrupo.nombre}» el ${hActual.dia} de ${cruce.horaInicio} a ${cruce.horaFin}. Seleccione otro docente o franja.`;
        }
      }
    }

    return null;
  }

  /**
   * API-M3-02: GET /api/v1/profesores/{id}/grupos
   */
  obtenerGruposPorProfesor(profesorId: string): GrupoAsignadoProfesorM3[] {
    const resultado: GrupoAsignadoProfesorM3[] = [];
    for (const grupo of this.grupos) {
      if (!grupo.activo) continue;
      const asignacion = grupo.profesoresAsignados.find(
        (p) => p.profesorId === profesorId,
      );
      if (asignacion || grupo.profesorId === profesorId) {
        resultado.push({
          grupoId: grupo.grupoId,
          nombreGrupo: grupo.nombre,
          rolDocente: asignacion?.rolDocente ?? 'TITULAR',
          sedeNombre: grupo.sedeNombre,
          nivelNombre: grupo.nivelNombre,
          horarios: this.horariosActivosDelGrupo(grupo),
        });
      }
    }
    return resultado;
  }

  listarProfesoresConDisponibilidad(
    grupoId?: string,
  ): EvaluacionDisponibilidadProfesorM3[] {
    const grupoObjetivo = grupoId
      ? this.grupos.find((g) => g.grupoId === grupoId || g.id === grupoId)
      : undefined;

    return this.puertoM1.listarProfesoresActivos().map((prof) => {
      const infoM6 = this.puertoM6.obtenerDisponibilidadDocente(prof.profesorId);
      const detalleConflicto = grupoObjetivo
        ? this.evaluarConflictoHorarioProfesor(
            grupoObjetivo,
            prof.profesorId,
            prof.nombreCompleto,
          )
        : null;
      const yaAsignadoAlGrupo = grupoObjetivo
        ? this.profesorPerteneceAGrupo(grupoObjetivo, prof.profesorId)
        : false;

      return {
        profesorId: prof.profesorId,
        nombreCompleto: prof.nombreCompleto,
        especialidad: prof.especialidad ?? 'Patinaje de velocidad',
        cargo: infoM6?.cargo ?? 'Entrenador',
        estadoContrato: infoM6?.estadoContrato ?? 'ACTIVO',
        disponible: detalleConflicto === null,
        tieneConflicto: detalleConflicto !== null,
        yaAsignadoAlGrupo,
        detalleConflicto,
        gruposAsignados: this.obtenerGruposPorProfesor(prof.profesorId),
      };
    });
  }

  obtenerPerfilProfesor(profesorId: string) {
    const profM1 = this.puertoM1
      .listarProfesoresActivos()
      .find((p) => p.profesorId === profesorId);
    if (!profM1) {
      throw new NotFoundException(
        `El profesor con ID ${profesorId} no existe o no está activo en DEP-M1-02`,
      );
    }
    const infoM6 = this.puertoM6.obtenerDisponibilidadDocente(profesorId);
    return {
      profesorId: profM1.profesorId,
      nombreCompleto: profM1.nombreCompleto,
      estado: profM1.estado,
      especialidad: profM1.especialidad ?? 'Patinaje de velocidad',
      cargo: infoM6?.cargo ?? 'Entrenador',
      estadoContrato: infoM6?.estadoContrato ?? 'ACTIVO',
      disponibilidad: infoM6?.disponibilidad ?? [],
      bloquesOcupadosExternos: infoM6?.bloquesOcupadosExternos ?? [],
      gruposAsignados: this.obtenerGruposPorProfesor(profesorId),
    };
  }

  asignarProfesor(grupoId: string, dto: AsignarProfesorDto): Grupo {
    const grupo = this.findOne(grupoId);

    const profM1 = this.puertoM1
      .listarProfesoresActivos()
      .find((p) => p.profesorId === dto.profesorId);
    const nombreDocente =
      profM1?.nombreCompleto ?? dto.profesorNombre ?? dto.profesorId;

    const conflicto = this.evaluarConflictoHorarioProfesor(
      grupo,
      dto.profesorId,
      nombreDocente,
    );
    if (conflicto) {
      throw new BadRequestException(conflicto);
    }

    const rolDocente: RolDocenteGrupo =
      dto.rolDocente ??
      (grupo.profesoresAsignados.length === 0 ? 'TITULAR' : 'ASISTENTE');

    const yaExiste = grupo.profesoresAsignados.find(
      (p) => p.profesorId === dto.profesorId,
    );
    if (yaExiste) {
      yaExiste.rolDocente = dto.rolDocente ?? yaExiste.rolDocente;
      yaExiste.nombreCompleto = nombreDocente;
    } else {
      if (rolDocente === 'TITULAR') {
        for (const existente of grupo.profesoresAsignados) {
          if (existente.rolDocente === 'TITULAR') {
            existente.rolDocente = 'ASISTENTE';
          }
        }
      }
      grupo.profesoresAsignados.push({
        profesorId: dto.profesorId,
        nombreCompleto: nombreDocente,
        rolDocente,
        fechaAsignacion: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
      });
    }

    return this.sincronizarMetricas(grupo);
  }

  asignarProfesoresMultiple(
    grupoId: string,
    dto: AsignarProfesoresMultipleDto,
  ): Grupo {
    const grupo = this.findOne(grupoId);
    if (!dto.profesoresIds || dto.profesoresIds.length === 0) {
      throw new BadRequestException(
        'Debe seleccionar al menos un profesor para asignar al grupo',
      );
    }

    for (const profesorId of dto.profesoresIds) {
      const profM1 = this.puertoM1
        .listarProfesoresActivos()
        .find((p) => p.profesorId === profesorId);
      if (!profM1) {
        throw new BadRequestException(
          `El profesor '${profesorId}' no existe o no está activo en DEP-M1-02`,
        );
      }
      const conflicto = this.evaluarConflictoHorarioProfesor(
        grupo,
        profesorId,
        profM1.nombreCompleto,
      );
      if (conflicto) {
        throw new BadRequestException(conflicto);
      }
    }

    for (const profesorId of dto.profesoresIds) {
      const profM1 = this.puertoM1
        .listarProfesoresActivos()
        .find((p) => p.profesorId === profesorId)!;
      const yaAsignado = grupo.profesoresAsignados.find(
        (p) => p.profesorId === profesorId,
      );
      if (!yaAsignado) {
        const tieneTitular = grupo.profesoresAsignados.some(
          (p) => p.rolDocente === 'TITULAR',
        );
        grupo.profesoresAsignados.push({
          profesorId: profM1.profesorId,
          nombreCompleto: profM1.nombreCompleto,
          rolDocente:
            dto.rolDocente ?? (tieneTitular ? 'ASISTENTE' : 'TITULAR'),
          fechaAsignacion: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
        });
      }
    }

    return this.sincronizarMetricas(grupo);
  }

  desasignarProfesor(grupoId: string, profesorId: string): Grupo {
    const grupo = this.findOne(grupoId);
    const existia = grupo.profesoresAsignados.some(
      (p) => p.profesorId === profesorId,
    );
    if (!existia && grupo.profesorId !== profesorId) {
      throw new NotFoundException(
        `El profesor ${profesorId} no se encuentra asignado al grupo ${grupo.nombre}`,
      );
    }

    grupo.profesoresAsignados = grupo.profesoresAsignados.filter(
      (p) => p.profesorId !== profesorId,
    );

    if (
      grupo.profesoresAsignados.length > 0 &&
      !grupo.profesoresAsignados.some((p) => p.rolDocente === 'TITULAR')
    ) {
      grupo.profesoresAsignados[0].rolDocente = 'TITULAR';
    }

    return this.sincronizarMetricas(grupo);
  }

  // ==========================================================================
  // HU-3.3: PROGRAMACIÓN DE HORARIOS DE CLASE, ANTI-SOLAPAMIENTO Y DEP-M1-05
  // ==========================================================================

  private validarSolapamientoYDisponibilidadHorario(params: {
    grupo: Grupo;
    dia: DiaSemana;
    horaInicio: string;
    horaFin: string;
    sedeId: string;
    pista: string;
    aforoMaximoFisicoPista: number;
    excluirHorarioId?: string;
  }) {
    const {
      grupo,
      dia,
      horaInicio,
      horaFin,
      sedeId,
      pista,
      aforoMaximoFisicoPista,
      excluirHorarioId,
    } = params;

    if (!DIAS_VALIDOS.includes(dia)) {
      throw new BadRequestException(
        `El día '${dia}' no es un día de la semana válido`,
      );
    }

    if (horaInicio >= horaFin) {
      throw new BadRequestException(
        'La hora de inicio debe ser anterior a la hora de finalizacion',
      );
    }

    const solapaEnMismoGrupo = this.horariosActivosDelGrupo(grupo).some(
      (h) =>
        h.id !== excluirHorarioId &&
        h.horarioId !== excluirHorarioId &&
        h.dia === dia &&
        horaInicio < h.horaFin &&
        horaFin > h.horaInicio,
    );

    if (solapaEnMismoGrupo) {
      throw new BadRequestException(
        `El grupo «${grupo.nombre}» ya tiene un entrenamiento programado el día ${dia} en ese rango de horas`,
      );
    }

    for (const otroGrupo of this.grupos) {
      if (!otroGrupo.activo || otroGrupo.grupoId === grupo.grupoId) continue;

      for (const hOtro of this.horariosActivosDelGrupo(otroGrupo)) {
        if (
          hOtro.id === excluirHorarioId ||
          hOtro.horarioId === excluirHorarioId
        ) {
          continue;
        }
        const mismaPistaOSede =
          (hOtro.sedeId && hOtro.sedeId === sedeId) ||
          hOtro.pista.toLowerCase() === pista.toLowerCase();

        const mismoBloque =
          hOtro.dia === dia &&
          horaInicio < hOtro.horaFin &&
          horaFin > hOtro.horaInicio;

        if (mismaPistaOSede && mismoBloque) {
          const aforoCombinado = grupo.aforoMax + otroGrupo.aforoMax;
          throw new BadRequestException(
            `Solapamiento de pista: ${pista} ya está ocupada el ${dia} de ${hOtro.horaInicio} a ${hOtro.horaFin} por el grupo «${otroGrupo.nombre}» (aforo combinado ${aforoCombinado}/${aforoMaximoFisicoPista} excede la capacidad física de DEP-G4-01).`,
          );
        }
      }
    }

    for (const docente of grupo.profesoresAsignados) {
      const infoM6 = this.puertoM6.obtenerDisponibilidadDocente(
        docente.profesorId,
      );
      if (infoM6) {
        const conflictoExterno = infoM6.bloquesOcupadosExternos?.find(
          (b) =>
            b.diaSemana === dia &&
            horaInicio < b.horaFin &&
            horaFin > b.horaInicio,
        );
        if (conflictoExterno) {
          throw new BadRequestException(
            `Conflicto docente: ${docente.nombreCompleto} tiene ocupado el ${dia} de ${conflictoExterno.horaInicio} a ${conflictoExterno.horaFin} (${conflictoExterno.motivo}).`,
          );
        }
      }

      for (const otroGrupo of this.grupos) {
        if (!otroGrupo.activo || otroGrupo.grupoId === grupo.grupoId) continue;
        if (!this.profesorPerteneceAGrupo(otroGrupo, docente.profesorId))
          continue;

        const cruceDocente = this.horariosActivosDelGrupo(otroGrupo).find(
          (hOtro) =>
            hOtro.dia === dia &&
            horaInicio < hOtro.horaFin &&
            horaFin > hOtro.horaInicio,
        );
        if (cruceDocente) {
          throw new BadRequestException(
            `Conflicto docente: el profesor ${docente.nombreCompleto} ya dicta clase en «${otroGrupo.nombre}» el ${dia} de ${cruceDocente.horaInicio} a ${cruceDocente.horaFin}.`,
          );
        }
      }
    }
  }

  private obtenerDestinatariosNotificacionGrupo(grupo: Grupo): string[] {
    const ids = new Set<string>();
    for (const p of grupo.profesoresAsignados) {
      ids.add(p.profesorId);
    }
    if (grupo.profesorId) ids.add(grupo.profesorId);
    ids.add(`ESTUDIANTES-${grupo.grupoId}`);
    return Array.from(ids);
  }

  /**
   * API-M3-03: GET /api/v1/horarios
   */
  listarHorarios(filtros?: {
    grupoId?: string;
    sedeId?: string;
    fechaInicio?: string;
    fechaFin?: string;
    incluirCancelados?: boolean;
  }): Horario[] {
    const resultado: Horario[] = [];

    for (const grupo of this.grupos) {
      if (filtros?.grupoId && grupo.grupoId !== filtros.grupoId) continue;

      for (const h of grupo.horarios) {
        const sedeIdHorario = h.sedeId ?? grupo.sedeId;
        if (filtros?.sedeId && sedeIdHorario !== filtros.sedeId) continue;
        if (!filtros?.incluirCancelados && h.estado === 'CANCELADO') continue;

        resultado.push({
          ...h,
          id: h.horarioId ?? h.id,
          horarioId: h.horarioId ?? h.id,
          grupoId: grupo.grupoId,
          nombreGrupo: grupo.nombre,
          nivelNombre: grupo.nivelNombre,
          dia: h.diaSemana ?? h.dia,
          diaSemana: h.diaSemana ?? h.dia,
          sedeId: sedeIdHorario,
          sedeNombre: h.sedeNombre ?? grupo.sedeNombre,
          estado: h.estado ?? 'ACTIVO',
        });
      }
    }

    return resultado;
  }

  listarNotificacionesHorarios(): RegistroNotificacionM1[] {
    return this.puertoM1.listarNotificacionesEnviadas();
  }

  agregarHorario(grupoId: string, dto: CreateHorarioDto): Horario {
    const respuesta = this.crearHorario({
      grupoId,
      dia: dto.dia,
      diaSemana: dto.diaSemana,
      horaInicio: dto.horaInicio,
      horaFin: dto.horaFin,
      sedeId: dto.sedeId,
      pista: dto.pista,
    });
    return respuesta.horario;
  }

  crearHorario(dto: CreateHorarioDto): RespuestaOperacionHorarioM3 {
    const grupoId = dto.grupoId ?? 'GRP-01';
    const grupo = this.findOne(grupoId);
    const dia = (dto.diaSemana ?? dto.dia) as DiaSemana;
    if (!dia) {
      throw new BadRequestException('El día de la semana es obligatorio');
    }

    const sede = this.resolverSedePorIdOPista(
      dto.sedeId ?? dto.pista,
      grupo.sedeId,
    );
    const pista = dto.pista?.trim() || sede.pista;

    this.validarSolapamientoYDisponibilidadHorario({
      grupo,
      dia,
      horaInicio: dto.horaInicio,
      horaFin: dto.horaFin,
      sedeId: sede.sedeId,
      pista,
      aforoMaximoFisicoPista: sede.aforoMaximoFisico,
    });

    this.contadorHorarios += 1;
    const horarioId = `HOR-${String(this.contadorHorarios).padStart(2, '0')}`;
    const nuevoHorario: Horario = {
      id: horarioId,
      horarioId,
      grupoId: grupo.grupoId,
      nombreGrupo: grupo.nombre,
      nivelNombre: grupo.nivelNombre,
      dia,
      diaSemana: dia,
      horaInicio: dto.horaInicio,
      horaFin: dto.horaFin,
      sedeId: sede.sedeId,
      sedeNombre: sede.nombreSede,
      pista,
      estado: 'ACTIVO',
      motivoCancelacion: null,
    };

    grupo.horarios.push(nuevoHorario);
    if (!grupo.dias.includes(dia)) {
      grupo.dias.push(dia);
    }

    return {
      horario: nuevoHorario,
      notificacion: null,
    };
  }

  actualizarHorario(
    horarioId: string,
    dto: UpdateHorarioDto,
  ): RespuestaOperacionHorarioM3 {
    let grupoOrigen: Grupo | undefined;
    let horarioActual: Horario | undefined;

    for (const g of this.grupos) {
      const encontrado = g.horarios.find(
        (h) => h.id === horarioId || h.horarioId === horarioId,
      );
      if (encontrado) {
        grupoOrigen = g;
        horarioActual = encontrado;
        break;
      }
    }

    if (!grupoOrigen || !horarioActual) {
      throw new NotFoundException(`La franja horaria ${horarioId} no existe`);
    }

    const grupoDestino = dto.grupoId
      ? this.findOne(dto.grupoId)
      : grupoOrigen;

    const nuevoDia = (dto.diaSemana ??
      dto.dia ??
      horarioActual.diaSemana ??
      horarioActual.dia) as DiaSemana;
    const nuevaHoraInicio = dto.horaInicio ?? horarioActual.horaInicio;
    const nuevaHoraFin = dto.horaFin ?? horarioActual.horaFin;

    const sedeObjetivo = this.resolverSedePorIdOPista(
      dto.sedeId ?? dto.pista,
      horarioActual.sedeId ?? grupoDestino.sedeId,
    );
    const nuevaPista =
      dto.pista?.trim() ||
      (dto.sedeId ? sedeObjetivo.pista : horarioActual.pista) ||
      sedeObjetivo.pista;

    this.validarSolapamientoYDisponibilidadHorario({
      grupo: grupoDestino,
      dia: nuevoDia,
      horaInicio: nuevaHoraInicio,
      horaFin: nuevaHoraFin,
      sedeId: sedeObjetivo.sedeId,
      pista: nuevaPista,
      aforoMaximoFisicoPista: sedeObjetivo.aforoMaximoFisico,
      excluirHorarioId: horarioActual.horarioId ?? horarioActual.id,
    });

    const descripcionAnterior = `${horarioActual.dia} ${horarioActual.horaInicio}–${horarioActual.horaFin} (${horarioActual.pista})`;

    if (grupoDestino.grupoId !== grupoOrigen.grupoId) {
      grupoOrigen.horarios = grupoOrigen.horarios.filter(
        (h) => h.id !== horarioId && h.horarioId !== horarioId,
      );
      grupoDestino.horarios.push(horarioActual);
    }

    horarioActual.grupoId = grupoDestino.grupoId;
    horarioActual.nombreGrupo = grupoDestino.nombre;
    horarioActual.nivelNombre = grupoDestino.nivelNombre;
    horarioActual.dia = nuevoDia;
    horarioActual.diaSemana = nuevoDia;
    horarioActual.horaInicio = nuevaHoraInicio;
    horarioActual.horaFin = nuevaHoraFin;
    horarioActual.sedeId = sedeObjetivo.sedeId;
    horarioActual.sedeNombre = sedeObjetivo.nombreSede;
    horarioActual.pista = nuevaPista;
    horarioActual.estado = 'REPROGRAMADO';

    const notificacion = this.puertoM1.enviarNotificacion({
      destinatariosIds: this.obtenerDestinatariosNotificacionGrupo(grupoDestino),
      asunto: `Reprogramación de entrenamiento · ${grupoDestino.nombre}`,
      mensaje: `La sesión del grupo «${grupoDestino.nombre}» pasó de ${descripcionAnterior} a ${nuevoDia} ${nuevaHoraInicio}–${nuevaHoraFin} en ${nuevaPista}.`,
    });

    return {
      horario: horarioActual,
      notificacion,
    };
  }

  cancelarHorario(
    horarioId: string,
    dto: CancelarHorarioDto,
  ): RespuestaOperacionHorarioM3 {
    const motivo = dto.motivo?.trim();
    if (!motivo) {
      throw new BadRequestException(
        'El motivo es obligatorio para anular o cancelar una franja horaria',
      );
    }

    let grupo: Grupo | undefined;
    let horario: Horario | undefined;
    for (const g of this.grupos) {
      const encontrado = g.horarios.find(
        (h) => h.id === horarioId || h.horarioId === horarioId,
      );
      if (encontrado) {
        grupo = g;
        horario = encontrado;
        break;
      }
    }

    if (!grupo || !horario) {
      throw new NotFoundException(`La franja horaria ${horarioId} no existe`);
    }

    horario.estado = 'CANCELADO';
    horario.motivoCancelacion = motivo;

    const notificacion = this.puertoM1.enviarNotificacion({
      destinatariosIds: this.obtenerDestinatariosNotificacionGrupo(grupo),
      asunto: `Cancelación de sesión · ${grupo.nombre} (${horario.dia} ${horario.horaInicio})`,
      mensaje: `Se anuló la franja del ${horario.dia} (${horario.horaInicio}–${horario.horaFin} en ${horario.pista}) para el grupo «${grupo.nombre}». Motivo: ${motivo}.`,
    });

    return {
      horario,
      notificacion,
    };
  }

  // ==========================================================================
  // HU-3.4: SELECCIÓN Y CAMBIO DE GRUPO POR PARTE DEL USUARIO Y API-M3-04
  // ==========================================================================

  /**
   * API-M3-04: GET /api/v1/grupos/{id}/estudiantes
   */
  obtenerEstudiantesDeGrupo(grupoId: string): InscripcionEstudianteGrupoM3[] {
    this.findOne(grupoId);
    return this.inscripcionesEstudiantes.filter((i) => i.grupoId === grupoId);
  }

  listarPerfilesAutogestionHU34() {
    const perfiles = this.puertoM2.listarPerfilesDeportivos();
    return perfiles.map((p) => {
      const menor = this.puertoM1.validarMenorYAcudiente(p.estudianteId);
      const poliza = this.puertoM1.validarPolizaVigente(p.estudianteId);
      const plan = this.puertoG4.obtenerEstadoPlanYCartera(p.estudianteId);
      const inscripcionActiva = this.inscripcionesEstudiantes.find(
        (i) => i.estudianteId === p.estudianteId && i.estado === 'ACTIVO',
      );
      return {
        estudianteId: p.estudianteId,
        nombreCompleto: p.nombreCompleto,
        nivelId: p.nivelId,
        categoriaId: p.categoriaId,
        esMenorEdad: menor.esMenorEdad,
        edad: menor.edad,
        acudienteId: menor.acudienteId,
        nombreAcudiente: menor.nombreAcudiente,
        tieneAutorizacion: menor.tieneAutorizacion,
        polizaVigente: poliza.polizaVigente,
        planActivo: plan.planActivo,
        alDiaEnPagos: plan.alDiaEnPagos,
        nombrePlan: plan.nombrePlan,
        grupoActualId: inscripcionActiva?.grupoId ?? null,
        grupoActualNombre: inscripcionActiva?.nombreGrupo ?? null,
      };
    });
  }

  obtenerContextoAutogestionGrupo(
    estudianteId: string,
    actorRol: 'ESTUDIANTE' | 'ACUDIENTE' = 'ACUDIENTE',
    acudienteId?: string,
  ): ContextoAutogestionGrupoM3 {
    const perfilDeportivo = this.puertoM2.obtenerPerfilDeportivo(estudianteId);
    const validacionMenor = this.puertoM1.validarMenorYAcudiente(estudianteId);
    const poliza = this.puertoM1.validarPolizaVigente(estudianteId);
    const planCartera = this.puertoG4.obtenerEstadoPlanYCartera(estudianteId);

    const inscripcionActiva = this.inscripcionesEstudiantes.find(
      (i) => i.estudianteId === estudianteId && i.estado === 'ACTIVO',
    );
    const grupoActual = inscripcionActiva
      ? this.grupos.find((g) => g.grupoId === inscripcionActiva.grupoId) ?? null
      : null;

    let puedeGestionarCambio = true;
    let motivoBloqueoActor: string | null = null;

    if (validacionMenor.esMenorEdad && actorRol === 'ESTUDIANTE') {
      puedeGestionarCambio = false;
      motivoBloqueoActor =
        'Cambio no permitido para menores de edad: solo el acudiente autorizado puede inscribir o cambiar de grupo (DEP-M1-03).';
    } else if (validacionMenor.esMenorEdad && actorRol === 'ACUDIENTE') {
      const acudienteEfectivo = acudienteId ?? validacionMenor.acudienteId;
      if (
        !validacionMenor.tieneAutorizacion ||
        !validacionMenor.acudienteId ||
        acudienteEfectivo !== validacionMenor.acudienteId
      ) {
        puedeGestionarCambio = false;
        motivoBloqueoActor = `El estudiante menor de edad (${validacionMenor.nombreEstudiante}) no cuenta con autorización activa de su acudiente vinculado en DEP-M1-03.`;
      }
    }

    if (puedeGestionarCambio && !poliza.polizaVigente) {
      puedeGestionarCambio = false;
      motivoBloqueoActor = `La póliza médico-deportiva del estudiante se encuentra vencida (${poliza.fechaVencimiento.slice(0, 10)} · DEP-M1-04).`;
    } else if (
      puedeGestionarCambio &&
      (!planCartera.planActivo || !planCartera.alDiaEnPagos)
    ) {
      puedeGestionarCambio = false;
      motivoBloqueoActor = `El estudiante presenta bloqueo en plan o cartera (${planCartera.estadoCartera} · DEP-G4-02). Debe estar al día en pagos para inscribirse o cambiar de grupo.`;
    }

    const gruposElegibles = this.grupos
      .filter(
        (g) =>
          g.activo &&
          g.nivelId === perfilDeportivo.nivelId &&
          (planCartera.limiteClasesSemanales <= 0 ||
            g.dias.length <= planCartera.limiteClasesSemanales),
      )
      .map((g) => this.sincronizarMetricas(g));

    return {
      estudianteId,
      actorRol,
      actorId:
        actorRol === 'ACUDIENTE'
          ? (acudienteId ?? validacionMenor.acudienteId ?? 'ACU-01')
          : estudianteId,
      perfilDeportivo,
      validacionMenor,
      poliza,
      planCartera,
      puedeGestionarCambio,
      motivoBloqueoActor,
      grupoActual: grupoActual ? this.sincronizarMetricas(grupoActual) : null,
      gruposElegibles,
    };
  }

  inscribirOCambiarGrupoEstudiante(
    dto: InscribirCambiarGrupoDto,
  ): ResultadoCambioGrupoM3 {
    const contexto = this.obtenerContextoAutogestionGrupo(
      dto.estudianteId,
      dto.actorRol,
      dto.acudienteId,
    );

    if (!contexto.puedeGestionarCambio) {
      throw new BadRequestException(
        contexto.motivoBloqueoActor ??
          'No cumple las validaciones requeridas para inscribir o cambiar de grupo',
      );
    }

    const grupoDestino = this.findOne(dto.grupoDestinoId);
    if (!grupoDestino.activo) {
      throw new BadRequestException(
        `El grupo «${grupoDestino.nombre}» no se encuentra activo`,
      );
    }

    if (grupoDestino.nivelId !== contexto.perfilDeportivo.nivelId) {
      throw new BadRequestException(
        `El grupo «${grupoDestino.nombre}» (${grupoDestino.nivelNombre}) no corresponde al nivel técnico vigente del estudiante (${contexto.perfilDeportivo.nivelId} · DEP-M2-03).`,
      );
    }

    if (
      grupoDestino.dias.length > contexto.planCartera.limiteClasesSemanales
    ) {
      throw new BadRequestException(
        `El grupo «${grupoDestino.nombre}» (${grupoDestino.dias.length} días/semana) supera el límite de clases semanales del plan activo (${contexto.planCartera.limiteClasesSemanales} días/semana · DEP-G4-02).`,
      );
    }

    const inscripcionAnterior = this.inscripcionesEstudiantes.find(
      (i) => i.estudianteId === dto.estudianteId && i.estado === 'ACTIVO',
    );

    if (inscripcionAnterior?.grupoId === grupoDestino.grupoId) {
      throw new BadRequestException(
        `El estudiante ya se encuentra inscrito en el grupo «${grupoDestino.nombre}»`,
      );
    }

    if (grupoDestino.ocupados >= grupoDestino.aforoMax) {
      throw new BadRequestException(
        `No hay cupos disponibles en el grupo «${grupoDestino.nombre}» (${grupoDestino.ocupados}/${grupoDestino.aforoMax} · 100% de aforo alcanzado).`,
      );
    }

    let grupoAnterior: Grupo | null = null;
    if (inscripcionAnterior) {
      inscripcionAnterior.estado = 'RETIRADO_CAMBIO';
      const encontradoAnterior = this.grupos.find(
        (g) => g.grupoId === inscripcionAnterior.grupoId,
      );
      if (encontradoAnterior) {
        encontradoAnterior.ocupados = Math.max(
          0,
          encontradoAnterior.ocupados - 1,
        );
        grupoAnterior = this.sincronizarMetricas(encontradoAnterior);
      }
    }

    grupoDestino.ocupados += 1;
    const grupoNuevoActualizado = this.sincronizarMetricas(grupoDestino);

    const nuevaInscripcion: InscripcionEstudianteGrupoM3 = {
      estudianteId: dto.estudianteId,
      nombreEstudiante: contexto.perfilDeportivo.nombreCompleto,
      grupoId: grupoNuevoActualizado.grupoId,
      nombreGrupo: grupoNuevoActualizado.nombre,
      fechaInscripcion: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
      estado: 'ACTIVO',
    };
    this.inscripcionesEstudiantes.unshift(nuevaInscripcion);

    const tipoOperacion = grupoAnterior ? 'CAMBIO_GRUPO' : 'INSCRIPCION';
    const mensaje = grupoAnterior
      ? `Cambio confirmado: ${contexto.perfilDeportivo.nombreCompleto} pasó de «${grupoAnterior.nombre}» (${grupoAnterior.ocupados}/${grupoAnterior.aforoMax}) a «${grupoNuevoActualizado.nombre}» (${grupoNuevoActualizado.ocupados}/${grupoNuevoActualizado.aforoMax}). El cupo anterior fue liberado de inmediato.`
      : `Inscripción confirmada: ${contexto.perfilDeportivo.nombreCompleto} quedó inscrito en «${grupoNuevoActualizado.nombre}» (${grupoNuevoActualizado.ocupados}/${grupoNuevoActualizado.aforoMax}).`;

    return {
      estudianteId: dto.estudianteId,
      tipoOperacion,
      grupoAnterior,
      grupoNuevo: grupoNuevoActualizado,
      inscripcion: nuevaInscripcion,
      mensaje,
    };
  }

  // ==========================================================================
  // HU-3.5: CALENDARIO CONSOLIDADO SEGMENTADO POR ROL Y API-M3-05
  // ==========================================================================

  private resolverGruposVisiblesParaSesion(
    authorizationHeader?: string,
    grupoIdFiltro?: string,
  ): {
    sesion: RespuestaCalendarioConsolidadoM3['sesion'];
    gruposPermitidosIds: string[];
  } {
    const sesionM1 = this.puertoM1.validarSesion(authorizationHeader);
    let gruposAsociadosIds: string[] = [];

    if (sesionM1.rol === 'ADMIN') {
      gruposAsociadosIds = this.grupos
        .filter((g) => g.activo)
        .map((g) => g.grupoId);
    } else if (sesionM1.rol === 'PROFESOR') {
      gruposAsociadosIds = this.obtenerGruposPorProfesor(sesionM1.userId).map(
        (g) => g.grupoId,
      );
    } else {
      const estId = sesionM1.estudianteVinculadoId ?? sesionM1.userId;
      const insc = this.inscripcionesEstudiantes.find(
        (i) => i.estudianteId === estId && i.estado === 'ACTIVO',
      );
      gruposAsociadosIds = insc ? [insc.grupoId] : ['GRP-01'];
    }

    const gruposPermitidosIds = grupoIdFiltro
      ? gruposAsociadosIds.filter((id) => id === grupoIdFiltro)
      : gruposAsociadosIds;

    return {
      sesion: {
        userId: sesionM1.userId,
        rol: sesionM1.rol,
        nombreCompleto: sesionM1.nombreCompleto ?? sesionM1.userId,
        gruposAsociadosIds,
      },
      gruposPermitidosIds,
    };
  }

  /**
   * API-M3-05: GET /api/v1/calendario
   * Devuelve [{ eventoId, tipo, titulo, inicio, fin, ubicacion, ... }]
   * consolidando entrenamientos (HU-3.3), competencias (DEP-M4-01) y eventos
   * institucionales globales del club, filtrados por rol y pertenencia a grupo (DEP-M1-01).
   */
  obtenerEventosCalendario(
    authorizationHeader?: string,
    filtros?: {
      tipo?: string;
      grupoId?: string;
      fechaInicio?: string;
      fechaFin?: string;
    },
  ): EventoCalendarioM3[] {
    const { sesion, gruposPermitidosIds } =
      this.resolverGruposVisiblesParaSesion(
        authorizationHeader,
        filtros?.grupoId,
      );

    const eventos: EventoCalendarioM3[] = [];

    // 1. Entrenamientos de los grupos asociados al usuario (HU-3.3)
    for (const grupo of this.grupos) {
      if (!grupo.activo) continue;
      if (!gruposPermitidosIds.includes(grupo.grupoId)) continue;

      for (const h of this.horariosActivosDelGrupo(grupo)) {
        const dia = h.diaSemana ?? h.dia;
        const fechasMes = FECHAS_OCTUBRE_POR_DIA[dia] ?? ['2026-10-05'];
        for (const fecha of fechasMes) {
          const inicioIso = `${fecha}T${h.horaInicio}:00Z`;
          const finIso = `${fecha}T${h.horaFin}:00Z`;
          eventos.push({
            eventoId: `EVT-ENT-${h.horarioId ?? h.id}-${fecha}`,
            tipo: 'ENTRENAMIENTO',
            titulo: `Entrenamiento · ${grupo.nombre}`,
            inicio: inicioIso,
            fin: finIso,
            ubicacion: `${h.pista} (Sede ${h.sedeNombre ?? grupo.sedeNombre})`,
            sedeId: h.sedeId ?? grupo.sedeId,
            grupoId: grupo.grupoId,
            nombreGrupo: grupo.nombre,
            categorias: [grupo.categoriaNombre],
            descripcion: `Sesión de entrenamiento técnico nivel ${grupo.nivelNombre}. Entrenador: ${grupo.profesorNombre ?? 'Equipo técnico'}.`,
            estado:
              h.estado === 'REPROGRAMADO' ? 'REPROGRAMADO' : 'PROGRAMADO',
            editablePorAdmin: false,
          });
        }
      }
    }

    // 2. Competencias oficiales publicadas desde DEP-M4-01
    const competenciasM4 = this.puertoM4.listarCompetenciasPublicadas(
      filtros?.fechaInicio,
      filtros?.fechaFin,
    );
    for (const comp of competenciasM4) {
      const sede = this.puertoG4.obtenerSedePorId(comp.sedeId);
      eventos.push({
        eventoId: `EVT-COMP-${comp.competenciaId}`,
        tipo: 'COMPETENCIA',
        titulo: comp.titulo,
        inicio: comp.fechaInicio,
        fin: comp.fechaFin,
        ubicacion: sede
          ? `${sede.pista} · Sede ${sede.nombreSede}`
          : comp.sedeId,
        sedeId: comp.sedeId,
        grupoId: null,
        nombreGrupo: 'Grupos clasificados por categoría',
        categorias: comp.categorias,
        descripcion: `Competencia oficial publicada por Módulo 4 (DEP-M4-01). Categorías convocadas: ${comp.categorias.join(', ')}.`,
        estado: 'PROGRAMADO',
        editablePorAdmin: false,
      });
    }

    // 3. Eventos globales e institucionales del club (editables exclusivamente por ADMIN)
    for (const evtGlobal of this.eventosGlobalesClub) {
      if (evtGlobal.estado === 'ANULADO') continue;
      eventos.push({
        ...evtGlobal,
        editablePorAdmin: sesion.rol === 'ADMIN',
      });
    }

    return eventos
      .filter((ev) => {
        if (filtros?.tipo && ev.tipo !== filtros.tipo) return false;
        if (filtros?.fechaInicio && ev.fin < filtros.fechaInicio) return false;
        if (filtros?.fechaFin && ev.inicio > filtros.fechaFin) return false;
        return true;
      })
      .sort((a, b) => a.inicio.localeCompare(b.inicio));
  }

  obtenerCalendarioConContexto(
    authorizationHeader?: string,
    filtros?: {
      tipo?: string;
      grupoId?: string;
      fechaInicio?: string;
      fechaFin?: string;
    },
  ): RespuestaCalendarioConsolidadoM3 {
    const { sesion } = this.resolverGruposVisiblesParaSesion(
      authorizationHeader,
      filtros?.grupoId,
    );
    const eventos = this.obtenerEventosCalendario(authorizationHeader, filtros);
    return {
      sesion,
      eventos,
    };
  }

  private exigirRolAdminCalendario(authorizationHeader?: string) {
    const sesion = this.puertoM1.validarSesion(authorizationHeader);
    if (sesion.rol !== 'ADMIN') {
      throw new ForbiddenException(
        `Acceso denegado: solo el rol ADMIN puede crear, editar o anular eventos institucionales globales (rol actual: ${sesion.rol} · DEP-M1-01).`,
      );
    }
    return sesion;
  }

  /**
   * HU-3.5: Crear un evento global del club (restringido exclusivamente a ADMIN).
   */
  crearEventoGlobal(
    dto: CrearEventoGlobalDto,
    authorizationHeader?: string,
  ): EventoCalendarioM3 {
    this.exigirRolAdminCalendario(authorizationHeader);

    const titulo = dto.titulo?.trim();
    if (!titulo) {
      throw new BadRequestException(
        'El título del evento global es obligatorio',
      );
    }
    if (dto.inicio >= dto.fin) {
      throw new BadRequestException(
        'La fecha/hora de inicio debe ser anterior a la fecha/hora de fin',
      );
    }

    const consecutivo = String(this.eventosGlobalesClub.length + 1).padStart(
      2,
      '0',
    );
    const nuevoEvento: EventoCalendarioM3 = {
      eventoId: `EVT-INST-${consecutivo}`,
      tipo: 'EVENTO_INSTITUCIONAL',
      titulo,
      inicio: dto.inicio,
      fin: dto.fin,
      ubicacion: dto.ubicacion.trim(),
      sedeId: dto.sedeId ?? 'SEDE-NORTE-P1',
      grupoId: null,
      nombreGrupo: 'Todos los grupos del club',
      categorias: ['Todas las categorías'],
      descripcion:
        dto.descripcion?.trim() ||
        'Evento institucional global programado por la administración del club.',
      estado: 'PROGRAMADO',
      editablePorAdmin: true,
    };

    this.eventosGlobalesClub.push(nuevoEvento);
    return nuevoEvento;
  }

  /**
   * HU-3.5: Editar un evento global del club (restringido exclusivamente a ADMIN).
   */
  actualizarEventoGlobal(
    eventoId: string,
    dto: ActualizarEventoGlobalDto,
    authorizationHeader?: string,
  ): EventoCalendarioM3 {
    this.exigirRolAdminCalendario(authorizationHeader);

    const evento = this.eventosGlobalesClub.find(
      (e) => e.eventoId === eventoId,
    );
    if (!evento) {
      throw new NotFoundException(
        `El evento institucional global ${eventoId} no existe`,
      );
    }

    if (dto.titulo !== undefined) {
      if (!dto.titulo.trim()) {
        throw new BadRequestException('El título no puede estar vacío');
      }
      evento.titulo = dto.titulo.trim();
    }
    if (dto.inicio !== undefined) evento.inicio = dto.inicio;
    if (dto.fin !== undefined) evento.fin = dto.fin;
    if (evento.inicio >= evento.fin) {
      throw new BadRequestException(
        'La fecha/hora de inicio debe ser anterior a la fecha/hora de fin',
      );
    }
    if (dto.ubicacion !== undefined) evento.ubicacion = dto.ubicacion.trim();
    if (dto.descripcion !== undefined)
      evento.descripcion = dto.descripcion.trim();

    return evento;
  }

  /**
   * HU-3.5: Anular un evento global del club sin borrado físico (restringido exclusivamente a ADMIN).
   */
  anularEventoGlobal(
    eventoId: string,
    authorizationHeader?: string,
  ): EventoCalendarioM3 {
    this.exigirRolAdminCalendario(authorizationHeader);

    const evento = this.eventosGlobalesClub.find(
      (e) => e.eventoId === eventoId,
    );
    if (!evento) {
      throw new NotFoundException(
        `El evento institucional global ${eventoId} no existe`,
      );
    }

    evento.estado = 'ANULADO';
    return evento;
  }
}
