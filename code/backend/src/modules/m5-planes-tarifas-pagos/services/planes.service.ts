import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditoriaRepository } from '../../../common/auditoria/auditoria.repository.js';
import type { UsuarioAutenticado } from '../../../common/auth/usuario-autenticado.js';
import {
  BaseDatosService,
  type Consultor,
} from '../../../common/database/base-datos.service.js';
import { hoyEnClub } from '../../../common/utils/fecha-club.js';
import type {
  CrearPlanDto,
  DesactivarPlanDto,
  EditarPlanDto,
  FiltrosPlanesDto,
  RegistrarTarifaDto,
} from '../dto/planes.dto.js';
import { CARACTERISTICAS_TIPO_PLAN, TipoPlan } from '../enums/tipo-plan.enum.js';
import {
  PlanesRepository,
  type Plan,
  type PlanConTarifas,
} from '../repositories/planes.repository.js';
import { construirHistorialTarifas } from '../utils/historial-tarifas.js';

/** Vista del plan para el Administrador (pantalla «Planes y tarifas»). */
function aPlanAdministrado(fila: PlanConTarifas) {
  const tarifaVigente =
    fila.tarifaVigenteValor === null
      ? null
      : { valor: fila.tarifaVigenteValor, vigenteDesde: fila.tarifaVigenteDesde };
  return {
    id: fila.id,
    nombre: fila.nombre,
    tipo: fila.tipo,
    periodicidad: fila.periodicidad,
    diasPorSemana: fila.diasPorSemana,
    incluyeGimnasio: fila.incluyeGimnasio,
    diaLimitePago: fila.diaLimitePago,
    descripcion: fila.descripcion,
    estado: fila.estado,
    tarifaVigente,
    tarifaProgramada:
      fila.tarifaProgramadaValor === null
        ? null
        : { valor: fila.tarifaProgramadaValor, vigenteDesde: fila.tarifaProgramadaDesde },
    patinadores: fila.patinadores,
    /** Se puede asignar a patinadores: activo y con tarifa vigente. */
    asignable: fila.estado === 'ACTIVO' && tarifaVigente !== null,
    ultimaModificacion: fila.modificadoPor
      ? { por: fila.modificadoPor, en: fila.modificadoEn }
      : null,
  };
}

/** Vista pública del plan (oferta): sin datos internos como el número de patinadores. */
function aPlanOfertado(fila: PlanConTarifas) {
  return {
    id: fila.id,
    nombre: fila.nombre,
    tipo: fila.tipo,
    periodicidad: fila.periodicidad,
    diasPorSemana: fila.diasPorSemana,
    incluyeGimnasio: fila.incluyeGimnasio,
    diaLimitePago: fila.diaLimitePago,
    descripcion: fila.descripcion,
    tarifa: { valor: fila.tarifaVigenteValor, vigenteDesde: fila.tarifaVigenteDesde },
  };
}

/**
 * Planes de servicio y sus tarifas (RF-M5-01 a RF-M5-05). Un plan nunca se
 * borra: se desactiva y sus patinadores lo conservan. El precio no se edita:
 * se registra una tarifa nueva con fecha de vigencia.
 */
@Injectable()
export class PlanesService {
  constructor(
    private readonly baseDatos: BaseDatosService,
    private readonly planes: PlanesRepository,
    private readonly auditoria: AuditoriaRepository,
  ) {}

  /** RF-M5-05 (Administrador): todos los planes, también los inactivos, con filtros. */
  async listar(filtros: FiltrosPlanesDto) {
    const filas = await this.planes.listar(this.baseDatos.consultor, hoyEnClub(), filtros);
    return filas.map(aPlanAdministrado);
  }

  /** RF-M5-05 (Contador, Acudiente, Patinador): solo planes activos con tarifa vigente. */
  async oferta() {
    const fecha = hoyEnClub();
    const filas = await this.planes.listar(this.baseDatos.consultor, fecha, { soloOfertables: true });
    return { fecha, planes: filas.map(aPlanOfertado) };
  }

  /** Un plan con su historial de tarifas (vigente, programadas e históricas). */
  async detalle(planId: number) {
    const hoy = hoyEnClub();
    const consultor = this.baseDatos.consultor;
    const [fila] = await this.planes.listar(consultor, hoy, { id: planId });
    if (!fila) {
      throw new NotFoundException('El plan no existe');
    }
    const tarifas = construirHistorialTarifas(await this.planes.tarifas(consultor, planId), hoy);
    return { ...aPlanAdministrado(fila), tarifas };
  }

  /** RF-M5-01. El plan queda activo, pero no se puede asignar hasta tener tarifa. */
  async crear(usuario: UsuarioAutenticado, dto: CrearPlanDto) {
    if (dto.tipo === TipoPlan.DIA_UNICO && dto.diaLimitePago !== undefined) {
      throw new BadRequestException(
        'El plan de día único se cobra por sesión y no tiene día límite de pago',
      );
    }
    const caracteristicas = CARACTERISTICAS_TIPO_PLAN[dto.tipo];

    const planId = await this.baseDatos.transaccion(async (tx) => {
      await this.validarNombreLibre(tx, dto.nombre);
      const id = await this.planes.crear(tx, {
        nombre: dto.nombre.trim(),
        tipo: dto.tipo,
        ...caracteristicas,
        diaLimitePago: dto.diaLimitePago ?? null,
        descripcion: dto.descripcion?.trim() || null,
        creadoPor: usuario.id,
      });
      await this.auditoria.registrar(tx, {
        modulo: 'M5',
        tabla: 'plan',
        registroId: id,
        accion: 'CREAR_PLAN',
        valorNuevo: dto,
        usuarioId: usuario.id,
      });
      return id;
    });
    return this.detalle(planId);
  }

  /** RF-M5-02: nombre, día límite y descripción. Tipo, periodicidad y precio no se editan aquí. */
  async editar(usuario: UsuarioAutenticado, planId: number, dto: EditarPlanDto) {
    if (dto.nombre === undefined && dto.diaLimitePago === undefined && dto.descripcion === undefined) {
      throw new BadRequestException('No hay cambios para guardar');
    }

    await this.baseDatos.transaccion(async (tx) => {
      const plan = await this.obtenerPlan(tx, planId);
      if (plan.periodicidad === 'POR_SESION' && dto.diaLimitePago !== undefined) {
        throw new BadRequestException(
          'El plan de día único se cobra por sesión y no tiene día límite de pago',
        );
      }
      if (dto.nombre !== undefined) {
        await this.validarNombreLibre(tx, dto.nombre, planId);
      }

      await this.planes.actualizar(tx, planId, dto);
      await this.auditoria.registrar(tx, {
        modulo: 'M5',
        tabla: 'plan',
        registroId: planId,
        accion: 'EDITAR_PLAN',
        valorAnterior: {
          nombre: plan.nombre,
          diaLimitePago: plan.diaLimitePago,
          descripcion: plan.descripcion,
        },
        valorNuevo: dto,
        usuarioId: usuario.id,
      });
    });
    return this.detalle(planId);
  }

  /**
   * RF-M5-03: deja de poder asignarse a patinadores nuevos. Quienes ya lo
   * tienen lo conservan, y sus cobros y pagos no cambian.
   */
  async desactivar(usuario: UsuarioAutenticado, planId: number, dto: DesactivarPlanDto) {
    await this.baseDatos.transaccion(async (tx) => {
      const plan = await this.obtenerPlan(tx, planId);
      if (plan.estado === 'INACTIVO') {
        throw new ConflictException('El plan ya está inactivo');
      }
      await this.planes.desactivar(tx, planId);
      await this.auditoria.registrar(tx, {
        modulo: 'M5',
        tabla: 'plan',
        registroId: planId,
        accion: 'DESACTIVAR_PLAN',
        valorAnterior: { estado: 'ACTIVO' },
        valorNuevo: { estado: 'INACTIVO' },
        motivo: dto.motivo?.trim() || null,
        usuarioId: usuario.id,
      });
    });
    return this.detalle(planId);
  }

  /**
   * RF-M5-04: nueva tarifa desde una fecha (hoy o futura). No es retroactiva:
   * los cobros ya generados conservan la tarifa con que se emitieron.
   */
  async registrarTarifa(usuario: UsuarioAutenticado, planId: number, dto: RegistrarTarifaDto) {
    if (dto.vigenteDesde < hoyEnClub()) {
      throw new BadRequestException(
        'La tarifa no puede regir desde una fecha pasada; los cobros ya generados conservan su tarifa',
      );
    }

    await this.baseDatos.transaccion(async (tx) => {
      const plan = await this.obtenerPlan(tx, planId);
      if (plan.estado === 'INACTIVO') {
        throw new ConflictException('No se puede registrar la tarifa de un plan inactivo');
      }
      if (await this.planes.existeTarifaDesde(tx, planId, dto.vigenteDesde)) {
        throw new ConflictException(`Ya hay una tarifa que rige desde el ${dto.vigenteDesde}`);
      }

      const anterior = await this.planes.tarifaVigente(tx, planId, dto.vigenteDesde);
      const tarifaId = await this.planes.crearTarifa(tx, {
        planId,
        valor: dto.valor,
        vigenteDesde: dto.vigenteDesde,
        registradoPor: usuario.id,
      });
      await this.auditoria.registrar(tx, {
        modulo: 'M5',
        tabla: 'tarifa',
        registroId: tarifaId,
        accion: 'REGISTRAR_TARIFA',
        valorAnterior: anterior
          ? { tarifaId: anterior.id, valor: anterior.valor, vigenteDesde: anterior.vigenteDesde }
          : null,
        valorNuevo: { planId, valor: dto.valor, vigenteDesde: dto.vigenteDesde },
        usuarioId: usuario.id,
      });
    });
    return this.detalle(planId);
  }

  /** Obtiene el plan y lo bloquea hasta el fin de la transacción. */
  private async obtenerPlan(tx: Consultor, planId: number): Promise<Plan> {
    const plan = await this.planes.obtener(tx, planId, true);
    if (!plan) {
      throw new NotFoundException('El plan no existe');
    }
    return plan;
  }

  private async validarNombreLibre(tx: Consultor, nombre: string, excluirId?: number) {
    if (await this.planes.existeNombre(tx, nombre, excluirId)) {
      throw new ConflictException('Ya existe un plan con ese nombre');
    }
  }
}
