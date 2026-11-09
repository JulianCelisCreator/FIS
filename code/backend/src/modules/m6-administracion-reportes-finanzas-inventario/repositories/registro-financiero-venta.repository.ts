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

/**
 * Punto de integración M6 → M5 para la venta de uniformes (RF-M6-07 delega el
 * ingreso, el pago y el comprobante a M5). Mientras M5 no publique su servicio,
 * escribe directamente en sus tablas con las mismas reglas del esquema:
 * un cobro VENTA_UNIFORME ya PAGADO, un pago REGISTRADO por el total, su
 * aplicación al cobro y el comprobante con consecutivo CP-xxxxxx (RF-M5-14).
 * Recibe el consultor de la transacción de la venta: si algo falla aquí, tampoco
 * se descuenta el inventario. Cuando M5 entregue su API, solo cambia esta clase.
 */
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
}
