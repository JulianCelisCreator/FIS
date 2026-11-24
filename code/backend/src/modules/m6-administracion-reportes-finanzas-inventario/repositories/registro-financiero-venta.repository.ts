import { Injectable } from '@nestjs/common';
import type { Consultor } from '../../../common/database/base-datos.service.js';
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
  async registrar(consultor: Consultor, asiento: AsientoVenta): Promise<AsientoRegistrado> {
    const [cobro] = await consultor
      .query<{ id: number; fecha: string }>(
        `INSERT INTO cobro (patinador_id, concepto, descripcion, valor, fecha_limite, estado, creado_por)
         VALUES ($1, 'VENTA_UNIFORME', $2, $3, current_date, 'PAGADO', $4)
         RETURNING id, fecha_limite AS fecha`,
        [asiento.patinadorId, asiento.descripcion, asiento.total, asiento.usuarioId],
      )
      .then((resultado) => resultado.rows);

    const [pago] = await consultor
      .query<{ id: number }>(
        `INSERT INTO pago (patinador_id, tipo, monto, fecha_pago, medio_pago, referencia, registrado_por)
         VALUES ($1, 'VENTA_UNIFORME', $2, current_date, $3, $4, $5)
         RETURNING id`,
        [asiento.patinadorId, asiento.total, asiento.medioPago, asiento.referenciaPago, asiento.usuarioId],
      )
      .then((resultado) => resultado.rows);

    await consultor.query(
      `INSERT INTO pago_cobro (pago_id, cobro_id, monto_aplicado) VALUES ($1, $2, $3)`,
      [pago.id, cobro.id, asiento.total],
    );

    const [comprobante] = await consultor
      .query<{ numero: string }>(
        `INSERT INTO comprobante (pago_id) VALUES ($1) RETURNING numero`,
        [pago.id],
      )
      .then((resultado) => resultado.rows);

    return { cobroId: cobro.id, pagoId: pago.id, comprobanteNumero: comprobante.numero, fecha: cobro.fecha };
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
