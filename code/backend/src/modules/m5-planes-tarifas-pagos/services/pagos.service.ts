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
import type { DatosTransaccionDto } from '../dto/datos-transaccion.dto.js';
import type {
  RegistrarMatriculaDto,
  RegistrarPagoCobroDto,
  RegistrarPagoSesionDto,
  RegistrarValoracionDto,
} from '../dto/registrar-pagos.dto.js';
import { AsignacionesRepository } from '../repositories/asignaciones.repository.js';
import { CobrosRepository } from '../repositories/cobros.repository.js';
import { PagosRepository, type NuevoPago } from '../repositories/pagos.repository.js';
import { PatinadoresRepository } from '../repositories/patinadores.repository.js';
import { PlanesRepository } from '../repositories/planes.repository.js';
import { sumarDias } from '../utils/calculo-cobros.js';

const formatoCop = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

/** Cobros que nacen en M6 (ventas y préstamos): sus pagos no se anulan desde M5. */
const CONCEPTOS_DE_M6 = ['VENTA_UNIFORME', 'PRESTAMO_IMPLEMENTO'];

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
    private readonly auditoria: AuditoriaRepository,
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
    // Se paga el día de la clase, por adelantado o, con recargo, al día siguiente (día de gracia).
    const fechaClase = dto.fechaClase ?? dto.fechaPago;
    const diaDeGracia = fechaClase === sumarDias(dto.fechaPago, -1);
    if (fechaClase < dto.fechaPago && !diaDeGracia) {
      throw new ConflictException(
        'Una sesión atrasada solo se puede pagar hasta el día siguiente a la clase',
      );
    }

    return this.baseDatos.transaccion(async (tx) => {
      await this.obtenerPatinadorBloqueado(tx, dto.patinadorId);

      const asignacion = await this.asignaciones.vigente(tx, dto.patinadorId, fechaClase);
      if (!asignacion || asignacion.periodicidad !== 'POR_SESION') {
        throw new ConflictException(
          'El patinador no tiene un plan de día único activo en la fecha de la clase',
        );
      }
      const tarifa = await this.planes.tarifaVigente(tx, asignacion.planId, fechaClase);
      if (!tarifa) {
        throw new ConflictException(`El plan ${asignacion.planNombre} no tiene una tarifa vigente`);
      }

      const valorSesiones = redondearCentavos(tarifa.valor * dto.numeroSesiones);
      const porcentaje = diaDeGracia
        ? await this.cobros.parametroNumerico(tx, 'recargo_sesion_pct', 10)
        : 0;
      const recargo = Math.round((valorSesiones * porcentaje) / 100);
      const monto = redondearCentavos(valorSesiones + recargo);
      const sesiones = dto.numeroSesiones === 1 ? '1 sesión' : `${dto.numeroSesiones} sesiones`;
      const cobroId = await this.cobros.crear(tx, {
        patinadorId: dto.patinadorId,
        asignacionPlanId: asignacion.id,
        tarifaId: tarifa.id,
        concepto: 'SESION',
        periodo: null,
        descripcion: `${asignacion.planNombre}: ${sesiones}`,
        valor: valorSesiones,
        fechaLimite: fechaClase,
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
      await this.pagos.aplicarACobro(tx, pagoId, cobroId, valorSesiones);

      let recargoCobroId: number | null = null;
      if (recargo > 0) {
        recargoCobroId = await this.cobros.crear(tx, {
          patinadorId: dto.patinadorId,
          asignacionPlanId: asignacion.id,
          tarifaId: null,
          concepto: 'RECARGO_MORA',
          periodo: null,
          descripcion: `Recargo por pago al día siguiente de la clase (${porcentaje} %)`,
          valor: recargo,
          fechaLimite: fechaClase,
          estado: 'PAGADO',
          creadoPor: usuario.id,
          cobroOrigenId: cobroId,
        });
        await this.pagos.aplicarACobro(tx, pagoId, recargoCobroId, recargo);
      }

      return {
        ...(await this.cerrarPago(tx, pagoId, dto.patinadorId)),
        cobroId,
        numeroSesiones: dto.numeroSesiones,
        valorSesion: tarifa.valor,
        fechaClase,
        recargo,
        monto,
      };
    });
  }

  /** Valores provisionales de la reunión del 19/11/2026 para mostrar los totales antes de confirmar. */
  async parametros() {
    const consultor = this.baseDatos.consultor;
    return {
      valorValoracion: await this.cobros.parametroNumerico(consultor, 'valor_clase_valoracion', 10000),
      recargoSesionPct: await this.cobros.parametroNumerico(consultor, 'recargo_sesion_pct', 10),
      recargoMoraMensualPct: await this.cobros.parametroNumerico(consultor, 'recargo_mora_mensual_pct', 10),
    };
  }

  /**
   * Clase de valoración previa a la inscripción (reunión del 19/11/2026). Se
   * paga una sola vez, antes de la matrícula, y su valor se abona a la matrícula.
   */
  async registrarValoracion(usuario: UsuarioAutenticado, dto: RegistrarValoracionDto) {
    validarFechaPago(dto.fechaPago);

    return this.baseDatos.transaccion(async (tx) => {
      await this.obtenerPatinadorBloqueado(tx, dto.patinadorId);
      if (await this.cobros.matriculaPagada(tx, dto.patinadorId)) {
        throw new ConflictException('El patinador ya está inscrito: la valoración es previa a la matrícula');
      }
      if ((await this.cobros.valoracionPagada(tx, dto.patinadorId)) !== null) {
        throw new ConflictException('El patinador ya pagó su clase de valoración');
      }

      const valor = await this.cobros.parametroNumerico(tx, 'valor_clase_valoracion', 10000);
      const cobroId = await this.cobros.crear(tx, {
        patinadorId: dto.patinadorId,
        asignacionPlanId: null,
        tarifaId: null,
        concepto: 'VALORACION',
        periodo: null,
        descripcion: 'Clase de valoración',
        valor,
        fechaLimite: dto.fechaPago,
        estado: 'PAGADO',
        creadoPor: usuario.id,
      });
      const pagoId = await this.pagos.crear(tx, {
        ...datosTransaccion(dto, usuario),
        patinadorId: dto.patinadorId,
        tipo: 'COBRO',
        monto: valor,
        numeroSesiones: null,
      });
      await this.pagos.aplicarACobro(tx, pagoId, cobroId, valor);

      return { ...(await this.cerrarPago(tx, pagoId, dto.patinadorId)), cobroId, monto: valor };
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

      // La clase de valoración pagada se abona a la matrícula (reunión del 19/11/2026).
      const valoracion = await this.cobros.valoracionPagada(tx, dto.patinadorId);
      const abonoValoracion = valoracion === null ? 0 : Math.min(valoracion, dto.valorMatricula - 1);
      const conceptos = [
        {
          concepto: 'MATRICULA' as const,
          descripcion: abonoValoracion > 0
            ? `Matrícula (abono de la valoración: ${formatoCop.format(abonoValoracion)})`
            : 'Matrícula',
          valor: redondearCentavos(dto.valorMatricula - abonoValoracion),
        },
        {
          concepto: 'GASTOS_ADMINISTRATIVOS' as const,
          descripcion: 'Gastos administrativos',
          valor: dto.valorGastosAdministrativos,
        },
      ];
      const monto = redondearCentavos(dto.valorMatricula - abonoValoracion + dto.valorGastosAdministrativos);
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
        abonoValoracion,
        cobros,
      };
    });
  }

  /**
   * RF-M5-11: anula un pago con motivo obligatorio. El pago y su comprobante se
   * conservan como ANULADO; el monto vuelve al saldo de sus cobros (el cobro de
   * sesiones, que nace con su pago, se anula con él) y la cartera se recalcula.
   */
  async anularPago(usuario: UsuarioAutenticado, pagoId: number, motivo: string) {
    return this.baseDatos.transaccion(async (tx) => {
      const pago = await this.pagos.bloquearParaAnular(tx, pagoId);
      if (!pago) {
        throw new NotFoundException('El pago no existe');
      }
      if (pago.estado === 'ANULADO') {
        throw new ConflictException('El pago ya está anulado');
      }
      if (pago.tipo === 'VENTA_UNIFORME') {
        throw new ConflictException('Los pagos de uniformes se gestionan con las devoluciones de M6');
      }
      const cobros = await this.pagos.cobrosDelPago(tx, pagoId);
      if (cobros.some((cobro) => CONCEPTOS_DE_M6.includes(cobro.concepto))) {
        throw new ConflictException('Los pagos de uniformes e implementos se gestionan en M6');
      }
      if (
        cobros.some((cobro) => cobro.concepto === 'VALORACION') &&
        (await this.cobros.matriculaPagada(tx, pago.patinadorId))
      ) {
        throw new ConflictException('La valoración ya se abonó a la matrícula; no se puede anular');
      }
      await this.obtenerPatinadorBloqueado(tx, pago.patinadorId);
      await this.cobros.bloquear(tx, cobros.map((cobro) => cobro.id));
      await this.pagos.anular(tx, pagoId, usuario.id, motivo);
      await this.pagos.anularComprobante(tx, pagoId);

      const cobrosAfectados = [];
      for (const cobro of cobros) {
        let estado: 'PENDIENTE' | 'PAGADO' | 'ANULADO';
        // Los cobros que nacen con su pago (sesiones, su recargo y la valoración) se anulan con él.
        if (pago.tipo === 'SESION' || cobro.concepto === 'VALORACION') {
          await this.cobros.anular(tx, cobro.id, `Pago anulado: ${motivo}`);
          estado = 'ANULADO';
        } else {
          estado = await this.cobros.recalcularEstado(tx, cobro.id);
        }
        cobrosAfectados.push({ cobroId: cobro.id, montoDevuelto: cobro.montoAplicado, estado });
      }

      await this.auditoria.registrar(tx, {
        modulo: 'M5',
        tabla: 'pago',
        registroId: pagoId,
        accion: 'ANULAR',
        valorAnterior: { estado: 'REGISTRADO', monto: pago.monto, comprobante: pago.comprobante },
        valorNuevo: { estado: 'ANULADO', cobros: cobrosAfectados },
        motivo,
        usuarioId: usuario.id,
      });

      return {
        pagoId,
        patinadorId: pago.patinadorId,
        estado: 'ANULADO' as const,
        comprobante: pago.comprobante,
        motivo,
        cobros: cobrosAfectados,
        estadoCartera: await this.pagos.estadoCartera(tx, pago.patinadorId),
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

  /** Emite el comprobante con sus datos históricos y lee la cartera recalculada. */
  private async cerrarPago(
    tx: Consultor,
    pagoId: number,
    patinadorId: number,
  ) {
    const datos = await this.pagos.obtenerDatosComprobante(tx, pagoId);

    if (!datos) {
      throw new Error(
        `No se encontraron los datos del pago ${pagoId} para generar el comprobante.`,
      );
    }

    const comprobante = await this.pagos.emitirComprobante(
      tx,
      pagoId,
      datos,
    );

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
