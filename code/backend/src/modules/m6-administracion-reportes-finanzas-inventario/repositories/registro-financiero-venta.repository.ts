import { Injectable } from '@nestjs/common';
import type { Consultor } from '../../../common/database/base-datos.service.js';
import { hoyEnClub } from '../../../common/utils/fecha-club.js';
import type { MedioPago as MedioPagoM5 } from '../../m5-planes-tarifas-pagos/enums/medio-pago.enum.js';
import { CobrosRepository } from '../../m5-planes-tarifas-pagos/repositories/cobros.repository.js';
import { PagosRepository } from '../../m5-planes-tarifas-pagos/repositories/pagos.repository.js';
import type { MedioPago } from '../dto/ventas.dto.js';

export interface AsientoVenta {
  patinadorId: number;
  total: number;
  descripcion: string;
  medioPago: MedioPago;
  referenciaPago: string | null;
  usuarioId: number;
}

export interface AsientoRegistrado {
  cobroId: number;
  pagoId: number;
  comprobanteNumero: string;
  fecha: string;
}

/** Integración financiera M6 → M5 para ventas y devoluciones de uniformes (HU-6.7). */
@Injectable()
export class RegistroFinancieroVentaRepository {
  constructor(
    private readonly cobrosM5: CobrosRepository,
    private readonly pagosM5: PagosRepository,
  ) {}

  async registrar(consultor: Consultor, asiento: AsientoVenta): Promise<AsientoRegistrado> {
    const fecha = hoyEnClub();
    const cobroId = await this.cobrosM5.crear(consultor, {
      patinadorId: asiento.patinadorId,
      asignacionPlanId: null,
      tarifaId: null,
      concepto: 'VENTA_UNIFORME',
      periodo: null,
      descripcion: asiento.descripcion,
      valor: asiento.total,
      fechaLimite: fecha,
      estado: 'PAGADO',
      creadoPor: asiento.usuarioId,
    });

    const pagoId = await this.pagosM5.crear(consultor, {
      patinadorId: asiento.patinadorId,
      tipo: 'VENTA_UNIFORME',
      monto: asiento.total,
      fechaPago: fecha,
      medioPago: asiento.medioPago as MedioPagoM5,
      referencia: asiento.referenciaPago,
      numeroSesiones: null,
      registradoPor: asiento.usuarioId,
    });

    await this.pagosM5.aplicarACobro(consultor, pagoId, cobroId, asiento.total);

    const datos = await this.pagosM5.obtenerDatosComprobante(consultor, pagoId);
    if (!datos) {
      throw new Error(`No se encontraron los datos del pago ${pagoId} para generar el comprobante.`);
    }
    const comprobante = await this.pagosM5.emitirComprobante(consultor, pagoId, datos);

    return { cobroId, pagoId, comprobanteNumero: comprobante.numero, fecha };
  }

  /** Anula pago, comprobante y cobro en M5 cuando hay devolución total. */
  async anular(
    consultor: Consultor,
    datos: { pagoId: number; cobroId: number; motivo: string; usuarioId: number },
  ): Promise<boolean> {
    const pago = await consultor.query(
      `UPDATE pago SET estado = 'ANULADO', anulado_por = $2, anulado_en = now(), motivo_anulacion = $3
       WHERE id = $1 AND estado = 'REGISTRADO'`,
      [datos.pagoId, datos.usuarioId, datos.motivo],
    );
    if ((pago.rowCount ?? 0) === 0) return false;
    await consultor.query(
      `UPDATE comprobante SET estado = 'ANULADO', anulado_en = now() WHERE pago_id = $1`,
      [datos.pagoId],
    );
    await consultor.query(
      `UPDATE cobro SET estado = 'ANULADO', anulado_en = now(), motivo_anulacion = $2, actualizado_en = now()
       WHERE id = $1`,
      [datos.cobroId, datos.motivo],
    );
    return true;
  }
}
