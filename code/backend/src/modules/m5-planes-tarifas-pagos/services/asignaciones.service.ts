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
import type { AsignarPlanDto } from '../dto/asignar-plan.dto.js';
import type { CambiarPlanDto } from '../dto/cambiar-plan.dto.js';
import { AsignacionesRepository } from '../repositories/asignaciones.repository.js';
import { CobrosRepository } from '../repositories/cobros.repository.js';
import { PatinadoresRepository } from '../repositories/patinadores.repository.js';
import {
  PlanesRepository,
  type Plan,
  type Tarifa,
} from '../repositories/planes.repository.js';
import {
  diasCobradosPrimerMes,
  DIAS_MES_COMERCIAL,
  fechaLimiteMensualidad,
  fechaLimitePrimeraMensualidad,
  primerDiaDelMes,
  primerDiaMesSiguiente,
  sumarDias,
  valorPrimeraMensualidad,
  vencidoDesde,
} from '../utils/calculo-cobros.js';
import {
  validarConsultaDePagos,
  validarGestionDePlan,
} from '../validators/acceso-patinador.validator.js';

/** Asignación (RF-M5-06) y cambio (RF-M5-07) del plan de un patinador. */
@Injectable()
export class AsignacionesService {
  constructor(
    private readonly baseDatos: BaseDatosService,
    private readonly patinadores: PatinadoresRepository,
    private readonly planes: PlanesRepository,
    private readonly asignaciones: AsignacionesRepository,
    private readonly cobros: CobrosRepository,
    private readonly auditoria: AuditoriaRepository,
  ) {}

  /**
   * Asigna un plan a un patinador sin plan activo ni programado. Si es su primer
   * plan, exige la matrícula y los gastos administrativos pagados. En los planes
   * mensuales crea la primera mensualidad, prorrateada si empieza después del 1.
   */
  async asignar(usuario: UsuarioAutenticado, dto: AsignarPlanDto) {
    const hoy = hoyEnClub();
    if (dto.fechaInicio < primerDiaDelMes(hoy)) {
      throw new BadRequestException('La fecha de inicio no puede ser anterior al mes actual');
    }

    return this.baseDatos.transaccion(async (tx) => {
      const patinador = await this.patinadores.obtenerContexto(tx, dto.patinadorId);
      validarGestionDePlan(usuario, patinador);
      await this.patinadores.bloquear(tx, patinador.id);

      const actual =
        (await this.asignaciones.vigente(tx, patinador.id, hoy)) ??
        (await this.asignaciones.programada(tx, patinador.id, hoy));
      if (actual) {
        throw new ConflictException(
          'El patinador ya tiene un plan activo o programado; usa el cambio de plan',
        );
      }
      const ultimaFechaFin = await this.asignaciones.ultimaFechaFin(tx, patinador.id);
      if (ultimaFechaFin && dto.fechaInicio <= ultimaFechaFin) {
        throw new ConflictException(
          `La fecha de inicio debe ser posterior al ${ultimaFechaFin}, cuando terminó el plan anterior`,
        );
      }

      const plan = await this.obtenerPlanAsignable(tx, dto.planId);
      const tarifa = await this.obtenerTarifa(tx, plan, dto.fechaInicio);

      const esPrimerPlan = !(await this.asignaciones.tieneHistorial(tx, patinador.id));
      if (esPrimerPlan && !(await this.cobros.matriculaPagada(tx, patinador.id))) {
        throw new ConflictException(
          'Registra y paga la matrícula y los gastos administrativos antes de activar el plan',
        );
      }

      const asignacionId = await this.asignaciones.crear(tx, {
        patinadorId: patinador.id,
        planId: plan.id,
        fechaInicio: dto.fechaInicio,
        asignacionAnteriorId: null,
        motivoCambio: null,
        asignadoPor: usuario.id,
      });

      const diasGracia = await this.cobros.diasGraciaMora(tx);
      const primerCobro =
        plan.periodicidad === 'MENSUAL'
          ? await this.crearPrimeraMensualidad(tx, {
              patinadorId: patinador.id,
              asignacionId,
              plan,
              tarifa,
              fechaInicio: dto.fechaInicio,
              usuarioId: usuario.id,
              diasGracia,
            })
          : null;
      const siguienteCobro =
        plan.periodicidad === 'MENSUAL'
          ? await this.describirMensualidad(
              tx,
              plan,
              primerDiaMesSiguiente(dto.fechaInicio),
              diasGracia,
            )
          : null;

      await this.auditoria.registrar(tx, {
        modulo: 'M5',
        tabla: 'asignacion_plan',
        registroId: asignacionId,
        accion: 'ASIGNAR_PLAN',
        valorNuevo: { planId: plan.id, fechaInicio: dto.fechaInicio, tarifa: tarifa.valor },
        usuarioId: usuario.id,
      });

      return {
        asignacionId,
        patinadorId: patinador.id,
        plan: { id: plan.id, nombre: plan.nombre, periodicidad: plan.periodicidad },
        fechaInicio: dto.fechaInicio,
        tarifa: tarifa.valor,
        primerCobro,
        siguienteCobro,
      };
    });
  }

  /**
   * Cambia el plan desde el siguiente periodo de facturación (día 1 del mes
   * siguiente). El cobro del mes en curso no cambia. Avisa si la frecuencia
   * semanal cambia, porque hay que ajustar el grupo del patinador (M3).
   */
  async cambiar(usuario: UsuarioAutenticado, dto: CambiarPlanDto) {
    const hoy = hoyEnClub();
    const rigeDesde = primerDiaMesSiguiente(hoy);

    return this.baseDatos.transaccion(async (tx) => {
      const patinador = await this.patinadores.obtenerContexto(tx, dto.patinadorId);
      validarGestionDePlan(usuario, patinador);
      await this.patinadores.bloquear(tx, patinador.id);

      const actual = await this.asignaciones.vigente(tx, patinador.id, hoy);
      if (!actual) {
        throw new ConflictException('El patinador no tiene un plan activo; usa la asignación de plan');
      }
      const programada = await this.asignaciones.programada(tx, patinador.id, hoy);
      if (programada) {
        throw new ConflictException(
          `Ya hay un cambio programado a ${programada.planNombre} desde el ${programada.fechaInicio}`,
        );
      }
      if (actual.planId === dto.planId) {
        throw new ConflictException('El patinador ya tiene ese plan');
      }

      const plan = await this.obtenerPlanAsignable(tx, dto.planId);
      const tarifa = await this.obtenerTarifa(tx, plan, rigeDesde);

      await this.asignaciones.cerrar(tx, actual.id, sumarDias(rigeDesde, -1));
      const asignacionId = await this.asignaciones.crear(tx, {
        patinadorId: patinador.id,
        planId: plan.id,
        fechaInicio: rigeDesde,
        asignacionAnteriorId: actual.id,
        motivoCambio: dto.motivo ?? null,
        asignadoPor: usuario.id,
      });

      await this.auditoria.registrar(tx, {
        modulo: 'M5',
        tabla: 'asignacion_plan',
        registroId: asignacionId,
        accion: 'CAMBIAR_PLAN',
        valorAnterior: { asignacionId: actual.id, planId: actual.planId },
        valorNuevo: { planId: plan.id, rigeDesde, tarifa: tarifa.valor },
        motivo: dto.motivo ?? null,
        usuarioId: usuario.id,
      });

      const requiereAjusteGrupo = actual.diasPorSemana !== plan.diasPorSemana;
      return {
        asignacionId,
        patinadorId: patinador.id,
        planAnterior: { id: actual.planId, nombre: actual.planNombre },
        planNuevo: { id: plan.id, nombre: plan.nombre, periodicidad: plan.periodicidad },
        rigeDesde,
        tarifa: tarifa.valor,
        proximoCobro:
          plan.periodicidad === 'MENSUAL'
            ? await this.describirMensualidad(tx, plan, rigeDesde, await this.cobros.diasGraciaMora(tx))
            : null,
        requiereAjusteGrupo,
        aviso: requiereAjusteGrupo
          ? `La frecuencia semanal pasa de ${actual.diasPorSemana ?? '—'} a ${plan.diasPorSemana ?? '—'} días; ajusta el grupo del patinador`
          : null,
      };
    });
  }

  /** Plan vigente, cambio programado e historial de planes del patinador. */
  async consultarPlan(usuario: UsuarioAutenticado, patinadorId: number) {
    const consultor = this.baseDatos.consultor;
    const patinador = await this.patinadores.obtenerContexto(consultor, patinadorId);
    validarConsultaDePagos(usuario, patinador);

    const hoy = hoyEnClub();
    const [actual, programado, historial] = await Promise.all([
      this.asignaciones.vigente(consultor, patinadorId, hoy),
      this.asignaciones.programada(consultor, patinadorId, hoy),
      this.asignaciones.historial(consultor, patinadorId),
    ]);
    return { patinadorId, actual, programado, historial };
  }

  private async obtenerPlanAsignable(consultor: Consultor, planId: number): Promise<Plan> {
    const plan = await this.planes.obtener(consultor, planId);
    if (!plan) {
      throw new NotFoundException('El plan no existe');
    }
    if (plan.estado !== 'ACTIVO') {
      throw new ConflictException('Un plan inactivo no se puede asignar');
    }
    return plan;
  }

  private async obtenerTarifa(consultor: Consultor, plan: Plan, fecha: string): Promise<Tarifa> {
    const tarifa = await this.planes.tarifaVigente(consultor, plan.id, fecha);
    if (!tarifa) {
      throw new ConflictException(`El plan ${plan.nombre} no tiene una tarifa vigente al ${fecha}`);
    }
    return tarifa;
  }

  private async crearPrimeraMensualidad(
    tx: Consultor,
    datos: {
      patinadorId: number;
      asignacionId: number;
      plan: Plan;
      tarifa: Tarifa;
      fechaInicio: string;
      usuarioId: number;
      diasGracia: number;
    },
  ) {
    const periodo = primerDiaDelMes(datos.fechaInicio);
    const diasCobrados = diasCobradosPrimerMes(datos.fechaInicio);
    const valor = valorPrimeraMensualidad(datos.tarifa.valor, datos.fechaInicio);
    const fechaLimite = fechaLimitePrimeraMensualidad(datos.fechaInicio, diaLimiteDe(datos.plan));
    const prorrateo =
      diasCobrados < DIAS_MES_COMERCIAL ? ` (prorrateada ${diasCobrados}/${DIAS_MES_COMERCIAL} días)` : '';

    const id = await this.cobros.crear(tx, {
      patinadorId: datos.patinadorId,
      asignacionPlanId: datos.asignacionId,
      tarifaId: datos.tarifa.id,
      concepto: 'MENSUALIDAD',
      periodo,
      descripcion: `Mensualidad ${datos.plan.nombre} ${periodo.slice(5, 7)}/${periodo.slice(0, 4)}${prorrateo}`,
      valor,
      fechaLimite,
      estado: 'PENDIENTE',
      creadoPor: datos.usuarioId,
    });
    return {
      id,
      periodo,
      diasCobrados,
      valor,
      fechaLimite,
      vencidoDesde: vencidoDesde(fechaLimite, datos.diasGracia),
    };
  }

  /** Mensualidad completa que se generará el día 1 de `periodo`, con la tarifa vigente ese día. */
  private async describirMensualidad(tx: Consultor, plan: Plan, periodo: string, diasGracia: number) {
    const tarifa = await this.obtenerTarifa(tx, plan, periodo);
    const fechaLimite = fechaLimiteMensualidad(periodo, diaLimiteDe(plan));
    return {
      periodo,
      valor: tarifa.valor,
      fechaLimite,
      vencidoDesde: vencidoDesde(fechaLimite, diasGracia),
    };
  }
}

/** Los planes mensuales siempre tienen día límite (CHECK en la tabla plan). */
function diaLimiteDe(plan: Plan): number {
  if (plan.diaLimitePago === null) {
    throw new ConflictException(`El plan ${plan.nombre} no tiene día límite de pago`);
  }
  return plan.diaLimitePago;
}
