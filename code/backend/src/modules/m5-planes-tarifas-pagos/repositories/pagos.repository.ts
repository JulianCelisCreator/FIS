import { Injectable } from '@nestjs/common';
import type { Consultor } from '../../../common/database/base-datos.service.js';
import type { MedioPago } from '../enums/medio-pago.enum.js';

export interface NuevoPago {
  patinadorId: number;
  tipo: 'COBRO' | 'SESION' | 'MATRICULA' | 'VENTA_UNIFORME';
  monto: number;
  fechaPago: string;
  medioPago: MedioPago;
  referencia: string | null;
  numeroSesiones: number | null;
  registradoPor: number;
}

export interface DatosComprobante {
  fechaPago: string;
  patinador: {
    id: number;
    nombre: string;
    tipoDocumento: string;
    numeroDocumento: string;
  };
  acudientes: {
    nombre: string;
    parentesco: string;
  }[];
  pago: {
    tipo: 'COBRO' | 'SESION' | 'MATRICULA' | 'VENTA_UNIFORME';
    monto: number;
    medioPago: MedioPago;
    referencia: string | null;
    numeroSesiones: number | null;
    registradoPor: {
      id: number;
      nombre: string;
    };
  };
  cobros: {
    concepto: string;
    descripcion: string | null;
    periodo: string | null;
    valor: number;
    montoAplicado: number;
    saldoRestante: number;
    plan: {
      id: number;
      nombre: string;
      tipo: string;
      periodicidad: string;
    } | null;
  }[];
}

export interface Comprobante {
  id: number;
  numero: string;
  datos: DatosComprobante;
}

export interface EstadoCartera {
  estado: 'AL_DIA' | 'PENDIENTE' | 'VENCIDO';
  saldoPendiente: number;
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


  async obtenerDatosComprobante(
    consultor: Consultor,
    pagoId: number,
  ): Promise<DatosComprobante | null> {
    const { rows } = await consultor.query<{ datos: DatosComprobante }>(
      `SELECT jsonb_build_object(
        'fechaPago', p.fecha_pago::text,
        'patinador', jsonb_build_object(
          'id', pt.id,
          'nombre', concat_ws(' ', pt.nombres, pt.apellidos),
          'tipoDocumento', pt.tipo_documento,
          'numeroDocumento', pt.numero_documento
        ),
        'acudientes', (
          SELECT COALESCE(
            jsonb_agg(
              jsonb_build_object(
                'nombre', concat_ws(' ', u.nombres, u.apellidos),
                'parentesco', ap.parentesco
              )
              ORDER BY u.nombres, u.apellidos
            ),
            '[]'::jsonb
          )
          FROM acudiente_patinador ap
          JOIN usuario u ON u.id = ap.acudiente_id
          WHERE ap.patinador_id = pt.id
            AND ap.desvinculado_en IS NULL
        ),
        'pago', jsonb_build_object(
          'tipo', p.tipo,
          'monto', p.monto,
          'medioPago', p.medio_pago,
          'referencia', p.referencia,
          'numeroSesiones', p.numero_sesiones,
          'registradoPor', jsonb_build_object(
            'id', ur.id,
            'nombre', concat_ws(' ', ur.nombres, ur.apellidos)
          )
        ),
        'cobros', (
          SELECT COALESCE(
            jsonb_agg(
              jsonb_build_object(
                'concepto', c.concepto,
                'descripcion', c.descripcion,
                'periodo', c.periodo,
                'valor', c.valor,
                'montoAplicado', pc.monto_aplicado,
                'saldoRestante', c.valor - (
                  SELECT COALESCE(SUM(pc2.monto_aplicado), 0)
                  FROM pago_cobro pc2
                  JOIN pago p2 ON p2.id = pc2.pago_id
                  WHERE pc2.cobro_id = c.id
                    AND p2.estado = 'REGISTRADO'
                ),
                'plan', CASE
                  WHEN pl.id IS NULL THEN NULL
                  ELSE jsonb_build_object(
                    'id', pl.id,
                    'nombre', pl.nombre,
                    'tipo', pl.tipo,
                    'periodicidad', pl.periodicidad
                  )
                END
              )
              ORDER BY c.id
            ),
            '[]'::jsonb
          )
          FROM pago_cobro pc
          JOIN cobro c ON c.id = pc.cobro_id
          LEFT JOIN asignacion_plan ap ON ap.id = c.asignacion_plan_id
          LEFT JOIN plan pl ON pl.id = ap.plan_id
          WHERE pc.pago_id = p.id
        )
      ) AS datos
      FROM pago p
      JOIN patinador pt ON pt.id = p.patinador_id
      JOIN usuario ur ON ur.id = p.registrado_por
      WHERE p.id = $1`,
      [pagoId],
    );

    return rows[0]?.datos ?? null;
  }
  /** Comprobante con consecutivo único y datos históricos (RF-M5-14). */
  async emitirComprobante(
    consultor: Consultor,
    pagoId: number,
    datos: DatosComprobante,
  ): Promise<Comprobante> {
    const { rows } = await consultor.query<Comprobante>(
      `INSERT INTO comprobante (pago_id, datos)
       VALUES ($1, $2)
       RETURNING id, numero, datos`,
      [pagoId, datos],
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
