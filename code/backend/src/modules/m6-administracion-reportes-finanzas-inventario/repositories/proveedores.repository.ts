import { Injectable } from '@nestjs/common';
import { BaseDatosService, type Consultor } from '../../../common/database/base-datos.service.js';
import type { CrearProveedorDto, FiltrosProveedoresDto } from '../dto/proveedores.dto.js';

export interface ProveedorInventario {
  id: number;
  razonSocial: string;
  nitDocumento: string;
  correo: string | null;
  telefono: string | null;
  activo: boolean;
  creadoEn: string;
}

@Injectable()
export class ProveedoresRepository {
  constructor(private readonly baseDatos: BaseDatosService) {}

  listar(filtros: FiltrosProveedoresDto): Promise<ProveedorInventario[]> {
    const condiciones: string[] = [];
    const parametros: unknown[] = [];
    if (filtros.buscar?.trim()) {
      parametros.push(`%${filtros.buscar.trim()}%`, `%${filtros.buscar.trim()}%`);
      condiciones.push(`(razon_social ILIKE $1 OR nit_documento ILIKE $2)`);
    }
    if (filtros.activo !== undefined) {
      parametros.push(filtros.activo === 'true');
      condiciones.push(`activo = $${parametros.length}`);
    }
    const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';
    return this.baseDatos.consultar<ProveedorInventario>(
      `SELECT id, razon_social AS "razonSocial", nit_documento AS "nitDocumento",
              correo, telefono, activo, creado_en AS "creadoEn"
       FROM proveedor ${where}
       ORDER BY activo DESC, razon_social`,
      parametros,
    );
  }

  async crear(dto: CrearProveedorDto, consultor: Consultor) {
    const [creado] = await consultor.query<{ id: number }>(
      `INSERT INTO proveedor (razon_social, nit_documento, correo, telefono)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [dto.razonSocial.trim(), dto.nitDocumento.trim(), dto.correo?.trim() || null, dto.telefono?.trim() || null],
    ).then((resultado) => resultado.rows);
    return creado;
  }

  detalle(id: number): Promise<ProveedorInventario | null> {
    return this.baseDatos.consultar<ProveedorInventario>(
      `SELECT id, razon_social AS "razonSocial", nit_documento AS "nitDocumento",
              correo, telefono, activo, creado_en AS "creadoEn"
       FROM proveedor WHERE id = $1`,
      [id],
    ).then((filas) => filas[0] ?? null);
  }

  async cambiarEstado(id: number, activo: boolean, consultor: Consultor) {
    const [actualizado] = await consultor.query<{ id: number }>(
      `UPDATE proveedor SET activo = $1, actualizado_en = NOW()
       WHERE id = $2 RETURNING id`,
      [activo, id],
    ).then((resultado) => resultado.rows);
    return actualizado ?? null;
  }
}
