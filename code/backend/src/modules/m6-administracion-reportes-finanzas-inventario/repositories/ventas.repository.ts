import { Injectable } from '@nestjs/common';
import { BaseDatosService, type Consultor } from '../../../common/database/base-datos.service.js';
import type { MedioPago, TipoComprador } from '../dto/ventas.dto.js';
import type { LineaVenta, UniformeVendible } from '../utils/reglas-venta.js';

export interface CompradorVenta {
  patinadorId: number;
  patinador: string;
  documento: string;
  acudientes: { id: number; nombre: string; parentesco: string }[];
}

export interface VentaRegistrada {
  id: number;
  fecha: string;
  patinadorId: number;
  patinador: string;
  compradorTipo: TipoComprador;
  comprador: string;
  medioPago: MedioPago;
  referenciaPago: string | null;
  total: number;
  comprobante: string;
  estadoPago: 'REGISTRADO' | 'ANULADO';
  registradoPor: string;
  registradoEn: string;
  items: LineaVenta[];
}

const SELECT_VENTA = `
  SELECT v.id, v.fecha, v.patinador_id AS "patinadorId",
         pt.nombres || ' ' || pt.apellidos AS patinador,
         v.comprador_tipo AS "compradorTipo",
         CASE WHEN v.comprador_tipo = 'ACUDIENTE' THEN cu.nombres || ' ' || cu.apellidos
              ELSE pt.nombres || ' ' || pt.apellidos END AS comprador,
         v.medio_pago AS "medioPago", pg.referencia AS "referenciaPago",
         v.total, cp.numero AS comprobante, pg.estado AS "estadoPago",
         ru.nombres || ' ' || ru.apellidos AS "registradoPor",
         v.creado_en AS "registradoEn",
         (SELECT json_agg(json_build_object(
                   'uniformeId', d.uniforme_id, 'referencia', d.referencia, 'talla', d.talla,
                   'cantidad', d.cantidad, 'valorUnitario', d.valor_unitario::float8,
                   'subtotal', d.subtotal::float8) ORDER BY d.referencia, d.talla)
          FROM venta_detalle d WHERE d.venta_id = v.id) AS items
  FROM venta_uniforme v
  JOIN patinador pt     ON pt.id = v.patinador_id
  LEFT JOIN usuario cu  ON cu.id = v.comprador_id
  JOIN pago pg          ON pg.id = v.pago_id
  JOIN comprobante cp   ON cp.pago_id = pg.id
  JOIN usuario ru       ON ru.id = v.registrado_por`;

@Injectable()
export class VentasRepository {
  constructor(private readonly baseDatos: BaseDatosService) {}

  listar(buscar?: string): Promise<VentaRegistrada[]> {
    const texto = buscar?.trim();
    return this.baseDatos.consultar<VentaRegistrada>(
      `${SELECT_VENTA}
       ${texto ? `WHERE (pt.nombres || ' ' || pt.apellidos) ILIKE $1
                    OR (cu.nombres || ' ' || cu.apellidos) ILIKE $1
                    OR cp.numero ILIKE $1
                    OR EXISTS (SELECT 1 FROM venta_detalle d WHERE d.venta_id = v.id AND d.referencia ILIKE $1)` : ''}
       ORDER BY v.creado_en DESC, v.id DESC
       LIMIT 200`,
      texto ? [`%${texto}%`] : [],
    );
  }

  async detalle(id: number, consultor: Consultor = this.baseDatos.consultor): Promise<VentaRegistrada | null> {
    const [venta] = await consultor
      .query<VentaRegistrada>(`${SELECT_VENTA} WHERE v.id = $1`, [id])
      .then((resultado) => resultado.rows);
    return venta ?? null;
  }

  /** Patinadores activos (M2) con sus acudientes vinculados y con cuenta activa (M1). */
  listarCompradores(): Promise<CompradorVenta[]> {
    return this.baseDatos.consultar<CompradorVenta>(
      `SELECT p.id AS "patinadorId",
              p.nombres || ' ' || p.apellidos AS patinador,
              p.tipo_documento || ' ' || p.numero_documento AS documento,
              COALESCE((
                SELECT json_agg(json_build_object(
                         'id', u.id, 'nombre', u.nombres || ' ' || u.apellidos,
                         'parentesco', ap.parentesco) ORDER BY ap.es_principal DESC, u.nombres)
                FROM acudiente_patinador ap
                JOIN usuario u ON u.id = ap.acudiente_id
                WHERE ap.patinador_id = p.id AND ap.desvinculado_en IS NULL AND u.estado = 'ACTIVA'
              ), '[]') AS acudientes
       FROM patinador p
       WHERE p.activo = true
       ORDER BY p.nombres, p.apellidos`,
    );
  }

  /**
   * Valida que el comprador exista: el patinador activo o un acudiente vinculado
   * a él con cuenta activa. Devuelve el usuario que queda como comprador (el
   * patinador puede no tener cuenta) o undefined si no es válido.
   */
  async resolverComprador(
    patinadorId: number,
    compradorTipo: TipoComprador,
    acudienteId: number | undefined,
    consultor: Consultor,
  ): Promise<{ compradorId: number | null } | undefined> {
    const [patinador] = await consultor
      .query<{ usuarioId: number | null }>(
        `SELECT usuario_id AS "usuarioId" FROM patinador WHERE id = $1 AND activo = true`,
        [patinadorId],
      )
      .then((resultado) => resultado.rows);
    if (!patinador) return undefined;
    if (compradorTipo === 'PATINADOR') return { compradorId: patinador.usuarioId };

    const [vinculo] = await consultor
      .query<{ id: number }>(
        `SELECT ap.acudiente_id AS id
         FROM acudiente_patinador ap
         JOIN usuario u ON u.id = ap.acudiente_id
         WHERE ap.patinador_id = $1 AND ap.acudiente_id = $2
           AND ap.desvinculado_en IS NULL AND u.estado = 'ACTIVA'`,
        [patinadorId, acudienteId],
      )
      .then((resultado) => resultado.rows);
    return vinculo ? { compradorId: vinculo.id } : undefined;
  }

  /** Lee y bloquea (FOR UPDATE, en orden de id) las referencias de la venta. */
  bloquearUniformes(ids: number[], consultor: Consultor): Promise<UniformeVendible[]> {
    return consultor
      .query<UniformeVendible>(
        `SELECT id, referencia, talla, tipo, precio_venta AS "precioVenta",
                cantidad_disponible AS "cantidadDisponible", activo
         FROM uniforme WHERE id = ANY($1::bigint[])
         ORDER BY id
         FOR UPDATE`,
        [ids],
      )
      .then((resultado) => resultado.rows);
  }

  async crear(
    datos: {
      patinadorId: number;
      compradorTipo: TipoComprador;
      compradorId: number | null;
      total: number;
      medioPago: MedioPago;
      cobroId: number;
      pagoId: number;
      usuarioId: number;
    },
    lineas: LineaVenta[],
    consultor: Consultor,
  ): Promise<number> {
    const [venta] = await consultor
      .query<{ id: number }>(
        `INSERT INTO venta_uniforme
         (patinador_id, comprador_tipo, comprador_id, total, medio_pago, cobro_id, pago_id, registrado_por)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id`,
        [
          datos.patinadorId,
          datos.compradorTipo,
          datos.compradorId,
          datos.total,
          datos.medioPago,
          datos.cobroId,
          datos.pagoId,
          datos.usuarioId,
        ],
      )
      .then((resultado) => resultado.rows);

    for (const linea of lineas) {
      await consultor.query(
        `INSERT INTO venta_detalle (venta_id, uniforme_id, referencia, talla, cantidad, valor_unitario)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [venta.id, linea.uniformeId, linea.referencia, linea.talla, linea.cantidad, linea.valorUnitario],
      );
      // La condición de stock repite la validación por si otra transacción se adelantó;
      // además el CHECK cantidad_disponible >= 0 de la tabla impide quedar en negativo.
      const descontado = await consultor.query(
        `UPDATE uniforme SET cantidad_disponible = cantidad_disponible - $1, actualizado_en = now()
         WHERE id = $2 AND cantidad_disponible >= $1`,
        [linea.cantidad, linea.uniformeId],
      );
      if (descontado.rowCount !== 1) throw new Error('STOCK_INSUFICIENTE');
      await consultor.query(
        `INSERT INTO movimiento_inventario (uniforme_id, tipo, cantidad, venta_id, observacion, registrado_por)
         VALUES ($1, 'VENTA', $2, $3, $4, $5)`,
        [linea.uniformeId, -linea.cantidad, venta.id, `Venta #${venta.id}`, datos.usuarioId],
      );
    }
    return venta.id;
  }
}
