import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { G4SedesCarteraMockAdapter } from '../external-dependencies/adapters/g4-sedes-cartera.mock.adapter.js';
import { M1UsuariosMockAdapter } from '../external-dependencies/adapters/m1-usuarios.mock.adapter.js';
import { M2DeportivoMockAdapter } from '../external-dependencies/adapters/m2-deportivo.mock.adapter.js';
import {
  type IPuertoG4SedesCartera,
  type IPuertoM1Usuarios,
  type IPuertoM2Deportivo,
  PUERTO_G4_SEDES_CARTERA,
  PUERTO_M1_USUARIOS,
  PUERTO_M2_DEPORTIVO,
} from '../external-dependencies/interfaces/external-dependencies.interfaces.js';
import {
  AsignarProfesorDto,
  CreateGrupoDto,
  UpdateGrupoDto,
} from './dto/create-grupo.dto.js';
import { CreateHorarioDto } from './dto/create-horario.dto.js';
import {
  type CategoriaPatinaje,
  type DiaSemana,
  type EstadoCupoGrupo,
  Grupo,
  type Horario,
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

@Injectable()
export class GruposService {
  private readonly puertoM1: IPuertoM1Usuarios;
  private readonly puertoM2: IPuertoM2Deportivo;
  private readonly puertoG4: IPuertoG4SedesCartera;

  private grupos: Grupo[] = [];

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
  ) {
    this.puertoM1 = puertoM1 ?? new M1UsuariosMockAdapter();
    this.puertoM2 = puertoM2 ?? new M2DeportivoMockAdapter();
    this.puertoG4 = puertoG4 ?? new G4SedesCarteraMockAdapter();

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
        horarios: [
          {
            id: 'HOR-01',
            dia: 'Martes',
            horaInicio: '15:00',
            horaFin: '17:00',
            pista: 'Pista Principal - El Salitre',
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
        horarios: [
          {
            id: 'HOR-02',
            dia: 'Martes',
            horaInicio: '14:00',
            horaFin: '16:00',
            pista: 'Pista 2 · Sur',
          },
          {
            id: 'HOR-03',
            dia: 'Jueves',
            horaInicio: '14:00',
            horaFin: '16:00',
            pista: 'Pista 2 · Sur',
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
        horarios: [
          {
            id: 'HOR-04',
            dia: 'Viernes',
            horaInicio: '16:00',
            horaFin: '18:00',
            pista: 'Pista 1 · Norte',
          },
          {
            id: 'HOR-05',
            dia: 'Sabado',
            horaInicio: '08:00',
            horaFin: '10:00',
            pista: 'Pista 1 · Norte',
          },
        ],
        activo: true,
      }),
    ];
  }

  /**
   * Regla de aforo RF2.5 / RF-M3-02 (aritmética entera según design-system.md §9.2):
   * - < 90% -> Con cupo (alerta90 = false)
   * - >= 90% y < 100% -> Alerta al 90 % (alerta90 = true)
   * - >= 100% -> Lleno (alerta90 = true, bloqueadoInscripcion = true)
   */
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
      profesorId: params.profesorId,
      profesorNombre: params.profesorNombre,
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
    return grupo;
  }

  /**
   * Catálogos consumidos de DEP-M2-01, DEP-M2-02 y DEP-G4-01 para el formulario
   * de configuración de grupos (HU-3.1).
   */
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
   * Devuelve [{ grupoId, nombre, nivelId, categoriaId, sedeId, aforoMax, ocupados, alerta90, ... }]
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

  /**
   * HU-3.1: Crear grupo validando campos obligatorios (nombre, nivel, sede, días, cupo)
   * y asegurando que no exceda el aforo físico máximo de DEP-G4-01.
   */
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
      horarios: [],
      activo: true,
    });

    this.grupos.push(nuevoGrupo);
    return nuevoGrupo;
  }

  /**
   * Editar configuración de un grupo existente revalidando límites de DEP-G4-01 y aforo.
   */
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

  /**
   * Desactivar o reactivar un grupo (Regla de negocio 5: sin borrado físico).
   */
  cambiarEstado(id: string, activo: boolean): Grupo {
    const grupo = this.findOne(id);
    grupo.activo = activo;
    return this.sincronizarMetricas(grupo);
  }

  /**
   * Escenario BDD 2: Valida y registra un cupo en el grupo, bloqueando al llegar al 100%.
   */
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

  asignarProfesor(grupoId: string, dto: AsignarProfesorDto): Grupo {
    const grupo = this.findOne(grupoId);

    const gruposDelProfesor = this.grupos.filter(
      (g) => g.profesorId === dto.profesorId && g.id !== grupoId,
    );

    for (const otroGrupo of gruposDelProfesor) {
      for (const hActual of grupo.horarios) {
        const hayCruce = otroGrupo.horarios.some(
          (hOtro) =>
            hOtro.dia === hActual.dia &&
            hActual.horaInicio < hOtro.horaFin &&
            hActual.horaFin > hOtro.horaInicio,
        );
        if (hayCruce) {
          throw new BadRequestException(
            `El profesor ${dto.profesorNombre} ya tiene clase asignada el ${hActual.dia} en ese bloque horario`,
          );
        }
      }
    }

    grupo.profesorId = dto.profesorId;
    grupo.profesorNombre = dto.profesorNombre;
    return grupo;
  }

  agregarHorario(grupoId: string, dto: CreateHorarioDto): Horario {
    const grupo = this.findOne(grupoId);

    if (dto.horaInicio >= dto.horaFin) {
      throw new BadRequestException(
        'La hora de inicio debe ser anterior a la hora de finalizacion',
      );
    }

    const existeSolapamiento = grupo.horarios.some(
      (h) =>
        h.dia === dto.dia &&
        dto.horaInicio < h.horaFin &&
        dto.horaFin > h.horaInicio,
    );

    if (existeSolapamiento) {
      throw new BadRequestException(
        `El grupo ya tiene un entrenamiento programado el dia ${dto.dia} en ese rango de horas`,
      );
    }

    const nuevoHorario: Horario = {
      id: `HOR-${Date.now()}`,
      dia: dto.dia,
      horaInicio: dto.horaInicio,
      horaFin: dto.horaFin,
      pista: dto.pista,
    };

    grupo.horarios.push(nuevoHorario);
    return nuevoHorario;
  }
}
