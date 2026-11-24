import { Injectable } from '@nestjs/common';
import { BaseDatosService, type Consultor } from '../../../common/database/base-datos.service.js';
import type { MedioPago, TipoComprador } from '../dto/ventas.dto.js';
import type { LineaVenta, UniformeVendible } from '../utils/reglas-venta.js';
import type { LineaDevolucion, LineaVendida } from '../utils/reglas-devolucion.js';

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
  pagoId: number;
  comprobante: string;
  estadoPago: 'REGISTRADO' | 'ANULADO';
  registradoPor: string;
  registradoEn: string;
  /** Derivado de las devoluciones: la venta en sí nunca cambia. */
  estado: 'CONFIRMADA' | 'DEVUELTA_PARCIAL' | 'DEVUELTA';
  valorDevuelto: number;
  items: (LineaVenta & { devuelto: number })[];
  devoluciones: DevolucionRegistrada[];
}

export interface DevolucionRegistrada {
  id: number;
  fecha: string;
  motivo: string;
  valorDevuelto: number;
  medioReembolso: MedioPago;
  anulaPago: boolean;
  registradoPor: string;
  items: { uniformeId: number; referencia: string; talla: string; cantidad: number; subtotal: number }[];
}

const SELECT_VENTA = `
  SELECT v.id, v.fecha, v.patinador_id AS "patinadorId",
         pt.nombres || ' ' || pt.apellidos AS patinador,
         v.comprador_tipo AS "compradorTipo",
         CASE WHEN v.comprador_tipo = 'ACUDIENTE' THEN cu.nombres || ' ' || cu.apellidos
              ELSE pt.nombres || ' ' || pt.apellidos END AS comprador,
         v.medio_pago AS "medioPago", pg.referencia AS "referenciaPago",
         v.total, v.pago_id AS "pagoId", cp.numero AS comprobante, pg.estado AS "estadoPago",
         ru.nombres || ' ' || ru.apellidos AS "registradoPor",
         v.creado_en AS "registradoEn",
         CASE WHEN dv.unidades IS NULL THEN 'CONFIRMADA'
              WHEN dv.unidades >= (SELECT sum(d.cantidad) FROM venta_detalle d WHERE d.venta_id = v.id)
                THEN 'DEVUELTA'
              ELSE 'DEVUELTA_PARCIAL' END AS estado,
         COALESCE(dv.valor, 0) AS "valorDevuelto",
         (SELECT json_agg(json_build_object(
                   'uniformeId', d.uniforme_id, 'referencia', d.referencia, 'talla', d.talla,
                   'cantidad', d.cantidad, 'valorUnitario', d.valor_unitario::float8,
                   'subtotal', d.subtotal::float8,
                   'devuelto', COALESCE((SELECT sum(dd.cantidad)::int
                                         FROM devolucion_venta_detalle dd
                                         JOIN devolucion_venta dvx ON dvx.id = dd.devolucion_id
                                         WHERE dvx.venta_id = v.id AND dd.uniforme_id = d.uniforme_id), 0)
                 ) ORDER BY d.referencia, d.talla)
          FROM venta_detalle d WHERE d.venta_id = v.id) AS items,
         COALESCE((SELECT json_agg(json_build_object(
                   'id', x.id, 'fecha', x.fecha, 'motivo', x.motivo,
                   'valorDevuelto', x.valor_devuelto::float8, 'medioReembolso', x.medio_reembolso,
                   'anulaPago', x.anula_pago,
                   'registradoPor', xu.nombres || ' ' || xu.apellidos,
                   'items', (SELECT json_agg(json_build_object(
                               'uniformeId', xd.uniforme_id, 'referencia', u.referencia, 'talla', u.talla,
                               'cantidad', xd.cantidad, 'subtotal', xd.subtotal::float8))
                             FROM devolucion_venta_detalle xd JOIN uniforme u ON u.id = xd.uniforme_id
                             WHERE xd.devolucion_id = x.id)
                 ) ORDER BY x.creado_en)
          FROM devolucion_venta x JOIN usuario xu ON xu.id = x.registrado_por
          WHERE x.venta_id = v.id), '[]'::json) AS devoluciones
  FROM venta_uniforme v
  LEFT JOIN LATERAL (
    SELECT sum(dd.cantidad) AS unidades, sum(dd.subtotal) AS valor
    FROM devolucion_venta x JOIN devolucion_venta_detalle dd ON dd.devolucion_id = x.id
    WHERE x.venta_id = v.id
  ) dv ON true
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

  /**
   * Bloquea la venta (FOR UPDATE, no la modifica) para que dos devoluciones
   * simultáneas no superen lo vendido, y devuelve sus líneas con lo ya devuelto.
   */
  async lineasParaDevolver(ventaId: number, consultor: Consultor) {
    const [venta] = await consultor
      .query<{ id: number; pagoId: number; cobroId: number; estadoPago: string }>(
        `SELECT v.id, v.pago_id AS "pagoId", v.cobro_id AS "cobroId", p.estado AS "estadoPago"
         FROM venta_uniforme v JOIN pago p ON p.id = v.pago_id
         WHERE v.id = $1
         FOR UPDATE OF v`,
        [ventaId],
      )
      .then((resultado) => resultado.rows);
    if (!venta) return null;
    const lineas = await consultor
      .query<LineaVendida>(
        `SELECT d.uniforme_id AS "uniformeId", d.referencia, d.talla, d.cantidad,
                d.valor_unitario AS "valorUnitario",
                COALESCE((SELECT sum(dd.cantidad)::int
                          FROM devolucion_venta_detalle dd
                          JOIN devolucion_venta x ON x.id = dd.devolucion_id
                          WHERE x.venta_id = d.venta_id AND dd.uniforme_id = d.uniforme_id), 0) AS devuelto
         FROM venta_detalle d WHERE d.venta_id = $1`,
        [ventaId],
      )
      .then((resultado) => resultado.rows);
    return { ...venta, lineas };
  }

  /** Registra la devolución, reingresa el stock y deja el movimiento DEVOLUCION. */
  async crearDevolucion(
    datos: {
      ventaId: number;
      motivo: string;
      medioReembolso: MedioPago;
      valorDevuelto: number;
      anulaPago: boolean;
      usuarioId: number;
    },
    lineas: LineaDevolucion[],
    consultor: Consultor,
  ): Promise<number> {
    const [devolucion] = await consultor
      .query<{ id: number }>(
        `INSERT INTO devolucion_venta
         (venta_id, motivo, valor_devuelto, medio_reembolso, anula_pago, registrado_por)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id`,
        [datos.ventaId, datos.motivo, datos.valorDevuelto, datos.medioReembolso, datos.anulaPago, datos.usuarioId],
      )
      .then((resultado) => resultado.rows);
    for (const linea of lineas) {
      await consultor.query(
        `INSERT INTO devolucion_venta_detalle (devolucion_id, uniforme_id, cantidad, valor_unitario)
         VALUES ($1, $2, $3, $4)`,
        [devolucion.id, linea.uniformeId, linea.cantidad, linea.valorUnitario],
      );
      await consultor.query(
        `UPDATE uniforme SET cantidad_disponible = cantidad_disponible + $1, actualizado_en = now()
         WHERE id = $2`,
        [linea.cantidad, linea.uniformeId],
      );
      await consultor.query(
        `INSERT INTO movimiento_inventario (uniforme_id, tipo, cantidad, venta_id, observacion, registrado_por)
         VALUES ($1, 'DEVOLUCION', $2, $3, $4, $5)`,
        [linea.uniformeId, linea.cantidad, datos.ventaId,
         `Devolución #${devolucion.id} de la venta #${datos.ventaId}: ${datos.motivo}`, datos.usuarioId],
      );
    }
    return devolucion.id;
  }
}
