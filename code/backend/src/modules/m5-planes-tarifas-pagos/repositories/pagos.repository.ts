
import { Injectable } from '@nestjs/common';
import type { Consultor } from '../../../common/database/base-datos.service.js';
import type { MedioPago } from '../enums/medio-pago.enum.js';

export interface NuevoPago {
  patinadorId: number;
  tipo: 'COBRO' | 'SESION' | 'MATRICULA';
  monto: number;
  fechaPago: string;
  medioPago: MedioPago;
  referencia: string | null;
  numeroSesiones: number | null;
  registradoPor: number;
}

export interface Comprobante {
  id: number;
  numero: string;
}

export interface EstadoCartera {
  estado: 'AL_DIA' | 'PENDIENTE' | 'VENCIDO';
  saldoPendiente: number;
}

export interface PagoParaAnular {
  id: number;
  patinadorId: number;
  estado: 'REGISTRADO' | 'ANULADO';
}

export interface CobroAfectado {
  id: number;
}

@Injectable()
export class PagosRepository {
  async crear(consultor: Consultor, datos: NuevoPago): Promise<number> {
    const { rows } = await consultor.query<{ id: number }>(
      `INSERT INTO pago (patinador_id, tipo, monto, fecha_pago, medio_pago, referencia,
                         numero_sesiones, registrado_por)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [
        datos.patinadorId,
        datos.tipo,
        datos.monto,
        datos.fechaPago,
        datos.medioPago,
        datos.referencia,
        datos.numeroSesiones,
        datos.registradoPor,
      ],
    );
    return rows[0].id;
  }

  async aplicarACobro(
    consultor: Consultor,
    pagoId: number,
    cobroId: number,
    montoAplicado: number,
  ): Promise<void> {
    await consultor.query(
      'INSERT INTO pago_cobro (pago_id, cobro_id, monto_aplicado) VALUES ($1, $2, $3)',
      [pagoId, cobroId, montoAplicado],
    );
  }

  /** Busca y bloquea un pago para impedir anulaciones o modificaciones concurrentes. */
  async bloquearParaAnular(
    consultor: Consultor,
    pagoId: number,
  ): Promise<PagoParaAnular | null> {
    const { rows } = await consultor.query<PagoParaAnular>(
      `SELECT id, patinador_id AS "patinadorId", estado
       FROM pago
       WHERE id = $1
       FOR UPDATE`,
      [pagoId],
    );
    return rows[0] ?? null;
  }

  /** Anula el pago sin eliminar su registro original. */
  async anular(
    consultor: Consultor,
    pagoId: number,
    usuarioId: number,
    motivo: string,
  ): Promise<void> {
    await consultor.query(
      `UPDATE pago
       SET estado = 'ANULADO',
           anulado_por = $2,
           anulado_en = now(),
           motivo_anulacion = $3
       WHERE id = $1`,
      [pagoId, usuarioId, motivo],
    );
  }

  /** Obtiene todos los cobros a los que se aplicó el pago. */
  async cobrosDelPago(
    consultor: Consultor,
    pagoId: number,
  ): Promise<CobroAfectado[]> {
    const { rows } = await consultor.query<CobroAfectado>(
      `SELECT cobro_id AS id
       FROM pago_cobro
       WHERE pago_id = $1`,
      [pagoId],
    );
    return rows;
  }

  /** Cambia el comprobante asociado al pago a estado ANULADO. */
  async anularComprobante(consultor: Consultor, pagoId: number): Promise<void> {
    await consultor.query(
      `UPDATE comprobante
       SET estado = 'ANULADO',
           anulado_en = now()
       WHERE pago_id = $1`,
      [pagoId],
    );
  }

  /** Comprobante con consecutivo único (RF-M5-14). */
  async emitirComprobante(consultor: Consultor, pagoId: number): Promise<Comprobante> {
    const { rows } = await consultor.query<Comprobante>(
      'INSERT INTO comprobante (pago_id) VALUES ($1) RETURNING id, numero',
      [pagoId],
    );
    return rows[0];
  }

  /** Estado de cartera recalculado (vista v_estado_cartera, RF-M5-12). */
  async estadoCartera(consultor: Consultor, patinadorId: number): Promise<EstadoCartera> {
    const { rows } = await consultor.query<EstadoCartera>(
      `SELECT estado, saldo_pendiente AS "saldoPendiente"
       FROM v_estado_cartera WHERE patinador_id = $1`,
      [patinadorId],
    );
    return rows[0] ?? { estado: 'AL_DIA', saldoPendiente: 0 };
  }
}
