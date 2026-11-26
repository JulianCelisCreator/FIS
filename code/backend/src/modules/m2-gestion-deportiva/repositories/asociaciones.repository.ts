import { Injectable } from '@nestjs/common';
import type { Consultor } from '../../../common/database/base-datos.service.js';

export interface AcudienteDisponible {
  id: number;
  nombre: string;
  tipoDocumento: string | null;
  numeroDocumento: string | null;
  correo: string;
}

export interface AcudienteVinculado extends AcudienteDisponible {
  parentesco: string;
  esPrincipal: boolean;
}

export interface PatinadorConAcudientes {
  id: number;
  nombre: string;
  tipoDocumento: string;
  numeroDocumento: string;
  fechaNacimiento: string;
  acudientes: AcudienteVinculado[];
}

@Injectable()
export class AsociacionesRepository {
  async listarPatinadores(consultor: Consultor, buscar?: string): Promise<PatinadorConAcudientes[]> {
    const texto = buscar?.trim() ? `%${buscar.trim().replace(/[\\%_]/g, '\\$&')}%` : null;
    const { rows } = await consultor.query<PatinadorConAcudientes>(
      `SELECT p.id, p.nombres || ' ' || p.apellidos AS nombre,
              p.tipo_documento AS "tipoDocumento", p.numero_documento AS "numeroDocumento",
              p.fecha_nacimiento AS "fechaNacimiento",
              COALESCE(json_agg(json_build_object(
                'id', u.id, 'nombre', u.nombres || ' ' || u.apellidos,
                'tipoDocumento', u.tipo_documento, 'numeroDocumento', u.numero_documento,
                'correo', u.correo, 'parentesco', ap.parentesco, 'esPrincipal', ap.es_principal
              ) ORDER BY ap.es_principal DESC, u.apellidos, u.nombres)
                FILTER (WHERE u.id IS NOT NULL), '[]'::json) AS acudientes
       FROM patinador p
       LEFT JOIN acudiente_patinador ap ON ap.patinador_id = p.id AND ap.desvinculado_en IS NULL
       LEFT JOIN usuario u ON u.id = ap.acudiente_id
       WHERE p.activo AND ($1::text IS NULL OR
         (p.nombres || ' ' || p.apellidos) ILIKE $1 OR p.numero_documento ILIKE $1)
       GROUP BY p.id
       ORDER BY p.apellidos, p.nombres
       LIMIT 100`,
      [texto],
    );
    return rows;
  }

  async listarAcudientes(consultor: Consultor, buscar?: string): Promise<AcudienteDisponible[]> {
    const texto = buscar?.trim() ? `%${buscar.trim().replace(/[\\%_]/g, '\\$&')}%` : null;
    const { rows } = await consultor.query<AcudienteDisponible>(
      `SELECT u.id, u.nombres || ' ' || u.apellidos AS nombre,
              u.tipo_documento AS "tipoDocumento", u.numero_documento AS "numeroDocumento", u.correo
       FROM usuario u
       JOIN usuario_rol ur ON ur.usuario_id = u.id
       JOIN rol r ON r.id = ur.rol_id AND r.codigo = 'ACUDIENTE'
       WHERE u.estado = 'ACTIVA' AND ($1::text IS NULL OR
         (u.nombres || ' ' || u.apellidos) ILIKE $1 OR u.numero_documento ILIKE $1 OR u.correo ILIKE $1)
       ORDER BY u.apellidos, u.nombres
       LIMIT 100`,
      [texto],
    );
    return rows;
  }

  async existePatinador(consultor: Consultor, patinadorId: number): Promise<boolean> {
    const { rows } = await consultor.query<{ existe: boolean }>(
      'SELECT EXISTS (SELECT 1 FROM patinador WHERE id = $1 AND activo) AS existe',
      [patinadorId],
    );
    return rows[0]?.existe ?? false;
  }

  async existeAcudiente(consultor: Consultor, acudienteId: number): Promise<boolean> {
    const { rows } = await consultor.query<{ existe: boolean }>(
      `SELECT EXISTS (
         SELECT 1 FROM usuario u
         JOIN usuario_rol ur ON ur.usuario_id = u.id
         JOIN rol r ON r.id = ur.rol_id AND r.codigo = 'ACUDIENTE'
         WHERE u.id = $1 AND u.estado = 'ACTIVA'
       ) AS existe`,
      [acudienteId],
    );
    return rows[0]?.existe ?? false;
  }

  async vincular(
    consultor: Consultor,
    datos: { patinadorId: number; acudienteId: number; parentesco: string; esPrincipal: boolean; vinculadoPor: number },
  ): Promise<{ id: number; vinculadoEn: Date }> {
    const { rows } = await consultor.query<{ id: number; vinculadoEn: Date }>(
      `INSERT INTO acudiente_patinador (acudiente_id, patinador_id, parentesco, es_principal, vinculado_por)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, vinculado_en AS "vinculadoEn"`,
      [datos.acudienteId, datos.patinadorId, datos.parentesco, datos.esPrincipal, datos.vinculadoPor],
    );
    return rows[0];
  }
}
