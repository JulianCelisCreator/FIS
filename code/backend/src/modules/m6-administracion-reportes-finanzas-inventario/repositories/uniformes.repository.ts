import { Injectable } from '@nestjs/common';
import { BaseDatosService } from '../../../common/database/base-datos.service.js';
import type { Consultor } from '../../../common/database/base-datos.service.js';
import type { AjustarStockDto, CrearUniformeDto, EditarUniformeDto, FiltrosUniformesDto } from '../dto/uniformes.dto.js';

export interface UniformeInventario {
  id: number;
  referencia: string;
  tipo: string;
  talla: string;
  proveedorId: number | null;
  proveedor: string | null;
  costo: number;
  precioVenta: number;
  cantidadDisponible: number;
  cantidadMinima: number;
  estadoStock: 'STOCK_NORMAL' | 'ALERTA_MINIMO';
  activo: boolean;
  fotoUrl: string | null;
}

export interface MovimientoInventario {
  id: number;
  uniformeId: number;
  referencia: string;
  tipo: string;
  cantidad: number;
  observacion: string | null;
  registradoPor: string;
  registradoEn: string;
}

@Injectable()
export class UniformesRepository {
  constructor(private readonly baseDatos: BaseDatosService) {}

  async listar(filtros: FiltrosUniformesDto): Promise<UniformeInventario[]> {
    const condiciones: string[] = [];
    const parametros: unknown[] = [];
    const agregar = (sql: string, valor: unknown) => {
      parametros.push(valor);
      condiciones.push(sql.replace('?', `$${parametros.length}`));
    };

    if (filtros.buscar?.trim()) {
      const valor = `%${filtros.buscar.trim()}%`;
      parametros.push(valor, valor, valor);
      const inicio = parametros.length - 2;
      condiciones.push(
        `(u.referencia ILIKE $${inicio} OR u.talla ILIKE $${inicio + 1} OR p.razon_social ILIKE $${inicio + 2})`,
      );
    }
    if (filtros.tipo) agregar('u.tipo = ?', filtros.tipo);
    if (filtros.talla?.trim()) agregar('u.talla ILIKE ?', `%${filtros.talla.trim()}%`);
    if (filtros.activo !== undefined) agregar('u.activo = ?', filtros.activo === 'true');

    const condicionesSql = condiciones.length > 0 ? `WHERE ${condiciones.join(' AND ')}` : '';
    return this.baseDatos.consultar<UniformeInventario>(
      `SELECT u.id, u.referencia, u.tipo, u.talla,
              u.proveedor_id AS "proveedorId",
              p.razon_social AS proveedor,
              u.costo, u.precio_venta AS "precioVenta",
              u.cantidad_disponible AS "cantidadDisponible",
              u.cantidad_minima AS "cantidadMinima",
              CASE WHEN u.cantidad_disponible <= u.cantidad_minima
                   THEN 'ALERTA_MINIMO' ELSE 'STOCK_NORMAL' END AS "estadoStock",
              u.activo
              , u.foto_url AS "fotoUrl"
       FROM uniforme u
       LEFT JOIN proveedor p ON p.id = u.proveedor_id
       ${condicionesSql}
       ORDER BY u.referencia, u.talla`,
      parametros,
    );
  }

  async detalle(id: number): Promise<UniformeInventario | null> {
    const [uniforme] = await this.baseDatos.consultar<UniformeInventario>(
      `SELECT u.id, u.referencia, u.tipo, u.talla,
              u.proveedor_id AS "proveedorId",
              p.razon_social AS proveedor,
              u.costo, u.precio_venta AS "precioVenta",
              u.cantidad_disponible AS "cantidadDisponible",
              u.cantidad_minima AS "cantidadMinima",
              CASE WHEN u.cantidad_disponible <= u.cantidad_minima
                   THEN 'ALERTA_MINIMO' ELSE 'STOCK_NORMAL' END AS "estadoStock",
              u.activo
              , u.foto_url AS "fotoUrl"
       FROM uniforme u LEFT JOIN proveedor p ON p.id = u.proveedor_id
       WHERE u.id = $1`,
      [id],
    );
    return uniforme ?? null;
  }

  async listarMovimientos(uniformeId?: number): Promise<MovimientoInventario[]> {
    const parametros: unknown[] = [];
    const filtro = uniformeId === undefined ? '' : 'WHERE m.uniforme_id = $1';
    if (uniformeId !== undefined) parametros.push(uniformeId);
    return this.baseDatos.consultar<MovimientoInventario>(
      `SELECT m.id,
              m.uniforme_id AS "uniformeId",
              u.referencia,
              m.tipo,
              m.cantidad,
              m.observacion,
              usuario.nombres || ' ' || usuario.apellidos AS "registradoPor",
              m.registrado_en AS "registradoEn"
       FROM movimiento_inventario m
       JOIN uniforme u ON u.id = m.uniforme_id
       JOIN usuario usuario ON usuario.id = m.registrado_por
       ${filtro}
       ORDER BY m.registrado_en DESC, m.id DESC`,
      parametros,
    );
  }

  async crear(dto: CrearUniformeDto, consultor: Consultor = this.baseDatos.consultor) {
    const [creado] = await consultor.query<{
      id: number; referencia: string; tipo: string; talla: string; activo: boolean;
    }>(
      `INSERT INTO uniforme
       (referencia, tipo, talla, proveedor_id, costo, precio_venta,
        cantidad_disponible, cantidad_minima, foto_url)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, referencia, tipo, talla, activo`,
      [
        dto.referencia.trim(),
        dto.tipo,
        dto.talla.trim(),
        dto.proveedorId ?? null,
        dto.costo,
        dto.precioVenta,
        dto.cantidadDisponible,
        dto.cantidadMinima,
        dto.fotoUrl?.trim() || null,
      ],
    ).then((resultado) => resultado.rows);
    return creado;
  }

  async ajustar(
    id: number,
    cantidad: AjustarStockDto['cantidad'],
    usuarioId: number,
    observacion: string | null,
    consultor: Consultor,
  ) {
    const [actual] = await consultor.query<{ id: number; cantidadDisponible: number }>(
      `SELECT id, cantidad_disponible AS "cantidadDisponible"
       FROM uniforme WHERE id = $1 AND activo = true FOR UPDATE`,
      [id],
    ).then((resultado) => resultado.rows);
    if (!actual) return null;
    const siguiente = actual.cantidadDisponible + cantidad;
    if (siguiente < 0) throw new Error('STOCK_NEGATIVO');

    await consultor.query(
      `UPDATE uniforme SET cantidad_disponible = $1 WHERE id = $2`,
      [siguiente, id],
    );
    await consultor.query(
      `INSERT INTO movimiento_inventario
       (uniforme_id, tipo, cantidad, observacion, registrado_por)
       VALUES ($1, 'AJUSTE', $2, $3, $4)`,
      [id, cantidad, observacion, usuarioId],
    );
    return { ...actual, cantidadDisponible: siguiente };
  }

  async editar(id: number, dto: EditarUniformeDto, consultor: Consultor) {
    const [actualizado] = await consultor.query<{ id: number }>(
      `UPDATE uniforme SET
        referencia = COALESCE($1, referencia),
        tipo = COALESCE($2, tipo),
        talla = COALESCE($3, talla),
        proveedor_id = CASE WHEN $4 THEN $5::integer ELSE proveedor_id END,
        costo = COALESCE($6, costo),
        precio_venta = COALESCE($7, precio_venta),
        cantidad_disponible = COALESCE($8, cantidad_disponible),
        cantidad_minima = COALESCE($9, cantidad_minima),
        foto_url = CASE WHEN $10 THEN NULLIF($11::text, '') ELSE foto_url END,
        actualizado_en = NOW()
       WHERE id = $12
       RETURNING id`,
      [
        dto.referencia?.trim() ?? null,
        dto.tipo ?? null,
        dto.talla?.trim() ?? null,
        dto.proveedorId !== undefined,
        dto.proveedorId ?? null,
        dto.costo ?? null,
        dto.precioVenta ?? null,
        dto.cantidadDisponible ?? null,
        dto.cantidadMinima ?? null,
        dto.fotoUrl !== undefined,
        dto.fotoUrl?.trim() ?? null,
        id,
      ],
    ).then((resultado) => resultado.rows);
    return actualizado ?? null;
  }

  async reactivar(id: number, consultor: Consultor) {
    const [actualizado] = await consultor.query<{ id: number }>(
      `UPDATE uniforme SET activo = true, actualizado_en = NOW()
       WHERE id = $1 AND activo = false
       RETURNING id`,
      [id],
    ).then((resultado) => resultado.rows);
    return actualizado ?? null;
  }

  async desactivar(
    id: number,
    _motivo: string,
    _usuarioId: number,
    consultor: Consultor,
  ) {
    const [actualizado] = await consultor.query<{ id: number }>(
      `UPDATE uniforme SET activo = false
       WHERE id = $1 AND activo = true
       RETURNING id`,
      [id],
    ).then((resultado) => resultado.rows);
    if (!actualizado) return null;
    return actualizado;
  }
}
