import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { UsuarioAutenticado } from '../../../common/auth/usuario-autenticado.js';
import {
  BaseDatosService,
  type Consultor,
} from '../../../common/database/base-datos.service.js';
import { hoyEnClub } from '../../../common/utils/fecha-club.js';
import type { DatosTransaccionDto } from '../dto/datos-transaccion.dto.js';
import type {
  RegistrarMatriculaDto,
  RegistrarPagoCobroDto,
  RegistrarPagoSesionDto,
} from '../dto/registrar-pagos.dto.js';
import { AsignacionesRepository } from '../repositories/asignaciones.repository.js';
import { CobrosRepository } from '../repositories/cobros.repository.js';
import { PagosRepository, type NuevoPago } from '../repositories/pagos.repository.js';
import { PatinadoresRepository } from '../repositories/patinadores.repository.js';
import { PlanesRepository } from '../repositories/planes.repository.js';

const formatoCop = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

/** Evita errores de punto flotante al restar valores con centavos. */
function redondearCentavos(valor: number): number {
  return Math.round(valor * 100) / 100;
}

/**
 * Registro manual de pagos en la sede (RF-M5-09, RF-M5-10). Cada pago genera
 * su comprobante (RF-M5-14) y devuelve el estado de cartera recalculado
 * (RF-M5-12). Los pagos no se editan ni se borran; se anulan (RF-M5-11).
 */
@Injectable()
export class PagosService {
  constructor(
    private readonly baseDatos: BaseDatosService,
    private readonly patinadores: PatinadoresRepository,
    private readonly planes: PlanesRepository,
    private readonly asignaciones: AsignacionesRepository,
    private readonly cobros: CobrosRepository,
    private readonly pagos: PagosRepository,
  ) {}

  /** Pago total o parcial de un cobro; el monto no puede superar su saldo. */
  async registrarPagoCobro(usuario: UsuarioAutenticado, dto: RegistrarPagoCobroDto) {
    validarFechaPago(dto.fechaPago);

    return this.baseDatos.transaccion(async (tx) => {
      const cobro = await this.cobros.bloquearParaPago(tx, dto.cobroId);
      if (!cobro) {
        throw new NotFoundException('El cobro no existe');
      }
      if (cobro.estado === 'ANULADO') {
        throw new ConflictException('El cobro está anulado');
      }

      const saldoAnterior = redondearCentavos(
        cobro.valor - (await this.cobros.totalPagado(tx, cobro.id)),
      );
      if (saldoAnterior <= 0) {
        throw new ConflictException('El cobro ya está pagado');
      }
      if (dto.monto > saldoAnterior) {
        throw new BadRequestException(
          `El monto no puede superar el saldo del cobro (${formatoCop.format(saldoAnterior)})`,
        );
      }

      const pagoId = await this.pagos.crear(tx, {
        ...datosTransaccion(dto, usuario),
        patinadorId: cobro.patinadorId,
        tipo: 'COBRO',
        monto: dto.monto,
        numeroSesiones: null,
      });
      await this.pagos.aplicarACobro(tx, pagoId, cobro.id, dto.monto);

      const saldoRestante = redondearCentavos(saldoAnterior - dto.monto);
      if (saldoRestante === 0) {
        await this.cobros.marcarPagado(tx, cobro.id);
      }

      return {
        ...(await this.cerrarPago(tx, pagoId, cobro.patinadorId)),
        monto: dto.monto,
        cobro: {
          id: cobro.id,
          concepto: cobro.concepto,
          periodo: cobro.periodo,
          descripcion: cobro.descripcion,
          valor: cobro.valor,
          estado: saldoRestante === 0 ? 'PAGADO' : 'PENDIENTE',
        },
        saldoAnterior,
        saldoRestante,
        pagoParcial: saldoRestante > 0,
      };
    });
  }

  /**
   * Pago por sesión de un plan de día único: crea un cobro por
   * sesiones × tarifa vigente que queda pagado de una vez.
   */
  async registrarPagoSesion(usuario: UsuarioAutenticado, dto: RegistrarPagoSesionDto) {
    validarFechaPago(dto.fechaPago);

    return this.baseDatos.transaccion(async (tx) => {
      await this.obtenerPatinadorBloqueado(tx, dto.patinadorId);

      const asignacion = await this.asignaciones.vigente(tx, dto.patinadorId, dto.fechaPago);
      if (!asignacion || asignacion.periodicidad !== 'POR_SESION') {
        throw new ConflictException(
          'El patinador no tiene un plan de día único activo en la fecha del pago',
        );
      }
      const tarifa = await this.planes.tarifaVigente(tx, asignacion.planId, dto.fechaPago);
      if (!tarifa) {
        throw new ConflictException(`El plan ${asignacion.planNombre} no tiene una tarifa vigente`);
      }

      const monto = redondearCentavos(tarifa.valor * dto.numeroSesiones);
      const sesiones = dto.numeroSesiones === 1 ? '1 sesión' : `${dto.numeroSesiones} sesiones`;
      const cobroId = await this.cobros.crear(tx, {
        patinadorId: dto.patinadorId,
        asignacionPlanId: asignacion.id,
        tarifaId: tarifa.id,
        concepto: 'SESION',
        periodo: null,
        descripcion: `${asignacion.planNombre}: ${sesiones}`,
        valor: monto,
        fechaLimite: dto.fechaPago,
        estado: 'PAGADO',
        creadoPor: usuario.id,
      });
      const pagoId = await this.pagos.crear(tx, {
        ...datosTransaccion(dto, usuario),
        patinadorId: dto.patinadorId,
        tipo: 'SESION',
        monto,
        numeroSesiones: dto.numeroSesiones,
      });
      await this.pagos.aplicarACobro(tx, pagoId, cobroId, monto);

      return {
        ...(await this.cerrarPago(tx, pagoId, dto.patinadorId)),
        cobroId,
        numeroSesiones: dto.numeroSesiones,
        valorSesion: tarifa.valor,
        monto,
      };
    });
  }

  /**
   * Matrícula y gastos administrativos: dos cobros pagados con un solo pago y
   * un solo comprobante. Son requisito para activar el primer plan (RF-M5-06).
   */
  async registrarMatricula(usuario: UsuarioAutenticado, dto: RegistrarMatriculaDto) {
    validarFechaPago(dto.fechaPago);

    return this.baseDatos.transaccion(async (tx) => {
      await this.obtenerPatinadorBloqueado(tx, dto.patinadorId);
      if (await this.cobros.matriculaPagada(tx, dto.patinadorId)) {
        throw new ConflictException('La matrícula y los gastos administrativos ya están pagados');
      }

      const conceptos = [
        { concepto: 'MATRICULA' as const, descripcion: 'Matrícula', valor: dto.valorMatricula },
        {
          concepto: 'GASTOS_ADMINISTRATIVOS' as const,
          descripcion: 'Gastos administrativos',
          valor: dto.valorGastosAdministrativos,
        },
      ];
      const monto = redondearCentavos(dto.valorMatricula + dto.valorGastosAdministrativos);
      const pagoId = await this.pagos.crear(tx, {
        ...datosTransaccion(dto, usuario),
        patinadorId: dto.patinadorId,
        tipo: 'MATRICULA',
        monto,
        numeroSesiones: null,
      });

      const cobros = [];
      for (const { concepto, descripcion, valor } of conceptos) {
        const cobroId = await this.cobros.crear(tx, {
          patinadorId: dto.patinadorId,
          asignacionPlanId: null,
          tarifaId: null,
          concepto,
          periodo: null,
          descripcion,
          valor,
          fechaLimite: dto.fechaPago,
          estado: 'PAGADO',
          creadoPor: usuario.id,
        });
        await this.pagos.aplicarACobro(tx, pagoId, cobroId, valor);
        cobros.push({ id: cobroId, concepto, valor });
      }

      return {
        ...(await this.cerrarPago(tx, pagoId, dto.patinadorId)),
        monto,
        cobros,
      };
    });
  }

  private async obtenerPatinadorBloqueado(tx: Consultor, patinadorId: number): Promise<void> {
    const patinador = await this.patinadores.obtenerContexto(tx, patinadorId);
    if (!patinador) {
      throw new NotFoundException('El patinador no existe');
    }
    await this.patinadores.bloquear(tx, patinadorId);
  }

  /** Emite el comprobante y lee la cartera ya recalculada con el nuevo pago. */
  private async cerrarPago(tx: Consultor, pagoId: number, patinadorId: number) {
    const comprobante = await this.pagos.emitirComprobante(tx, pagoId);
    const estadoCartera = await this.pagos.estadoCartera(tx, patinadorId);
    return { pagoId, patinadorId, comprobante, estadoCartera };
  }
}

/** La fecha de pago no puede ser posterior a hoy (REQUIREMENTS §5.3). */
function validarFechaPago(fechaPago: string): void {
  if (fechaPago > hoyEnClub()) {
    throw new BadRequestException('La fecha de pago no puede ser posterior a hoy');
  }
}

function datosTransaccion(
  dto: DatosTransaccionDto,
  usuario: UsuarioAutenticado,
): Pick<NuevoPago, 'fechaPago' | 'medioPago' | 'referencia' | 'registradoPor'> {
  return {
    fechaPago: dto.fechaPago,
    medioPago: dto.medioPago,
    referencia: dto.referencia?.trim() || null,
    registradoPor: usuario.id,
  };
}
