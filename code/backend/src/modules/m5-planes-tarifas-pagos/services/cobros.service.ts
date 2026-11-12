import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import type { UsuarioAutenticado } from '../../../common/auth/usuario-autenticado.js';
import { BaseDatosService } from '../../../common/database/base-datos.service.js';
import { hoyEnClub, ZONA_HORARIA_CLUB } from '../../../common/utils/fecha-club.js';
import { CobrosRepository } from '../repositories/cobros.repository.js';
import { PatinadoresRepository } from '../repositories/patinadores.repository.js';
import { diaDelMes, periodoDesdeMes } from '../utils/calculo-cobros.js';
import { validarConsultaDePagos } from '../validators/acceso-patinador.validator.js';

export interface ResultadoGeneracion {
  periodo: string;
  generados: number;
  omitidosSinTarifa: number;
}

/** Generación de mensualidades (RF-M5-08) y consulta de cobros pendientes. */
@Injectable()
export class CobrosService {
  private readonly logger = new Logger(CobrosService.name);

  constructor(
    private readonly baseDatos: BaseDatosService,
    private readonly cobros: CobrosRepository,
    private readonly patinadores: PatinadoresRepository,
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
      if (resultado.generados > 0 || resultado.omitidosSinTarifa > 0) {
        this.logger.log(
          `Mensualidades ${resultado.periodo}: ${resultado.generados} generadas, ` +
            `${resultado.omitidosSinTarifa} asignaciones sin tarifa vigente`,
        );
      }
    } catch (error) {
      this.logger.error(
        'Falló la generación automática de mensualidades',
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

    return this.baseDatos.transaccion(async (tx) => ({
      periodo,
      generados: await this.cobros.generarMensualidades(tx, periodo),
      omitidosSinTarifa: await this.cobros.asignacionesSinTarifa(tx, periodo),
    }));
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
