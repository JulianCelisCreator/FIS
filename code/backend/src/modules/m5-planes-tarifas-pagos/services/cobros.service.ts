import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { AuditoriaRepository } from '../../../common/auditoria/auditoria.repository.js';
import type { UsuarioAutenticado } from '../../../common/auth/usuario-autenticado.js';
import { BaseDatosService, type Consultor } from '../../../common/database/base-datos.service.js';
import { hoyEnClub, ZONA_HORARIA_CLUB } from '../../../common/utils/fecha-club.js';
import { CobrosRepository } from '../repositories/cobros.repository.js';
import { PatinadoresRepository } from '../repositories/patinadores.repository.js';
import { diaDelMes, periodoDesdeMes, primerDiaDelMes } from '../utils/calculo-cobros.js';
import { validarConsultaDePagos } from '../validators/acceso-patinador.validator.js';

export interface ResultadoGeneracion {
  periodo: string;
  generados: number;
  omitidosSinTarifa: number;
  /** Solo al generar el mes en curso: recargos por mora creados y planes cancelados por no pago. */
  recargosMora?: number;
  cancelacionesPorMora?: number;
}

/** Generación de mensualidades (RF-M5-08) y consulta de cobros pendientes. */
@Injectable()
export class CobrosService {
  private readonly logger = new Logger(CobrosService.name);

  constructor(
    private readonly baseDatos: BaseDatosService,
    private readonly cobros: CobrosRepository,
    private readonly patinadores: PatinadoresRepository,
    private readonly auditoria: AuditoriaRepository,
  ) {}

  /**
   * Corre todos los días a las 00:05 (hora del club). Desde el día configurado
   * en parametro_sistema.dia_generacion_cobros (1 por defecto) genera las
   * mensualidades del mes. Como la generación es idempotente, correrla a diario
   * recupera los meses en que el servidor estuvo apagado el día 1.
   */
  @Cron('5 0 * * *', { name: 'generacion-mensualidades', timeZone: ZONA_HORARIA_CLUB })
  async generarAutomaticamente(): Promise<void> {
    try {
      const hoy = hoyEnClub();
      if (diaDelMes(hoy) < (await this.diaDeGeneracion())) {
        return;
      }
      const resultado = await this.generarMensualidades();
      if (resultado.generados > 0 || resultado.omitidosSinTarifa > 0 || resultado.recargosMora || resultado.cancelacionesPorMora) {
        this.logger.log(
          `Mensualidades ${resultado.periodo}: ${resultado.generados} generadas, ` +
            `${resultado.omitidosSinTarifa} asignaciones sin tarifa vigente, ` +
            `${resultado.recargosMora ?? 0} recargos por mora, ` +
            `${resultado.cancelacionesPorMora ?? 0} planes cancelados por no pago`,
        );
      }
    } catch (error) {
      this.logger.error(
        'Falló la generación automática de mensualidades',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

/**
   * Revisa diariamente el estado de cartera de los patinadores.
   * La vista calcula los estados según los saldos y los días de gracia.
   */
  @Cron('10 0 * * *', {
    name: 'revision-diaria-cartera',
    timeZone: ZONA_HORARIA_CLUB,
  })
  async revisarEstadoCartera(): Promise<void> {
    try {
      const [resultado] = await this.baseDatos.consultar<{
        vencidos: number;
        pendientes: number;
        alDia: number;
      }>(
        `SELECT
           COUNT(*) FILTER (WHERE estado = 'VENCIDO')::int AS vencidos,
           COUNT(*) FILTER (WHERE estado = 'PENDIENTE')::int AS pendientes,
           COUNT(*) FILTER (WHERE estado = 'AL_DIA')::int AS "alDia"
         FROM v_estado_cartera`,
      );

      this.logger.log(
        `Revisión diaria de cartera: ${resultado.vencidos} vencidos, ` +
          `${resultado.pendientes} pendientes, ${resultado.alDia} al día`,
      );
    } catch (error) {
      this.logger.error(
        'Falló la revisión diaria de cartera',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  /** Genera las mensualidades de `mes` ('AAAA-MM'); por defecto, el mes actual. */
  async generarMensualidades(mes?: string): Promise<ResultadoGeneracion> {
    const mesActual = hoyEnClub().slice(0, 7);
    const mesAGenerar = mes ?? mesActual;
    if (mesAGenerar > mesActual) {
      throw new BadRequestException('No se pueden generar mensualidades de meses futuros');
    }
    const periodo = periodoDesdeMes(mesAGenerar);

    return this.baseDatos.transaccion(async (tx) => {
      // La mora va primero: un plan cancelado por no pago ya no recibe la mensualidad del mes.
      const mora = mesAGenerar === mesActual ? await this.procesarMora(tx, periodo) : null;
      return {
        periodo,
        generados: await this.cobros.generarMensualidades(tx, periodo),
        omitidosSinTarifa: await this.cobros.asignacionesSinTarifa(tx, periodo),
        ...mora,
      };
    });
  }

  /**
   * Reglas de mora del plan mensual (reunión del 19/11/2026): el primer mes sin
   * pagar se sigue entrenando; desde el segundo se cobra un recargo por cada
   * mensualidad atrasada y al empezar el tercero se cancela el plan.
   */
  private async procesarMora(tx: Consultor, mesActual: string) {
    const porcentaje = await this.cobros.parametroNumerico(tx, 'recargo_mora_mensual_pct', 10);
    const recargosMora = await this.cobros.generarRecargosMora(tx, primerDiaDelMes(mesActual), porcentaje);
    const canceladas = await this.cobros.cancelarPorMora(tx, primerDiaDelMes(mesActual));
    for (const asignacion of canceladas) {
      await this.auditoria.registrar(tx, {
        modulo: 'M5',
        tabla: 'asignacion_plan',
        registroId: asignacion.id,
        accion: 'CANCELAR_POR_MORA',
        valorNuevo: { fechaFin: asignacion.fechaFin, planId: asignacion.planId },
        motivo: 'Mensualidad pendiente desde hace tres meses',
        usuarioId: null,
      });
    }
    return { recargosMora, cancelacionesPorMora: canceladas.length };
  }

  /** Cobros con saldo de un patinador: lo que muestra «Cobro a pagar» al registrar un pago. */
  async pendientes(usuario: UsuarioAutenticado, patinadorId: number) {
    const consultor = this.baseDatos.consultor;
    const patinador = await this.patinadores.obtenerContexto(consultor, patinadorId);
    validarConsultaDePagos(usuario, patinador);

    const cobros = await this.cobros.pendientes(consultor, patinadorId);
    const saldoTotal = cobros.reduce((total, cobro) => total + cobro.saldo, 0);
    return { patinadorId, saldoTotal, cobros };
  }

  private async diaDeGeneracion(): Promise<number> {
    const [parametro] = await this.baseDatos.consultar<{ valor: string }>(
      `SELECT valor FROM parametro_sistema WHERE clave = 'dia_generacion_cobros'`,
    );
    const dia = Number(parametro?.valor);
    return Number.isInteger(dia) && dia >= 1 && dia <= 28 ? dia : 1;
  }
}
