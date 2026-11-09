import { Injectable } from '@nestjs/common';
import type { Rol } from '../../../common/auth/usuario-autenticado.js';
import type { Consultor } from '../../../common/database/base-datos.service.js';

export interface NuevoUsuario {
  nombres: string;
  apellidos: string;
  correo: string;
  contrasenaHash: string;
  /** null = autorregistro (RF-M1-01). */
  creadoPor: number | null;
}

export interface UsuarioCreado {
  id: number;
  nombres: string;
  apellidos: string;
  correo: string;
  estado: 'POR_REGISTRAR' | 'ACTIVA' | 'DESACTIVADA';
}

export interface UsuarioParaIngreso {
  id: number;
  nombre: string;
  estado: 'POR_REGISTRAR' | 'ACTIVA' | 'DESACTIVADA';
  contrasenaHash: string;
  roles: Rol[];
}

/** Código de PostgreSQL para una violación de índice único. */
const VIOLACION_UNICA = '23505';

/** Error que el servicio traduce a 409: el correo ya tiene cuenta. */
export class CorreoDuplicadoError extends Error {
  constructor() {
    super('correo duplicado');
    this.name = 'CorreoDuplicadoError';
  }
}

/** Cuentas de acceso (tabla usuario y usuario_rol, RF-M1-01). */
@Injectable()
export class UsuariosRepository {
  async existeCorreo(consultor: Consultor, correo: string): Promise<boolean> {
    const { rows } = await consultor.query<{ existe: boolean }>(
      `SELECT EXISTS (SELECT 1 FROM usuario WHERE lower(correo) = lower($1)) AS existe`,
      [correo],
    );
    return rows[0].existe;
  }

  /**
   * Inserta la cuenta. Si otra solicitud registró el mismo correo entre la
   * comprobación y el INSERT, el índice usuario_correo_uk lo detiene y se
   * lanza CorreoDuplicadoError.
   */
  async crear(consultor: Consultor, nuevo: NuevoUsuario): Promise<UsuarioCreado> {
    try {
      const { rows } = await consultor.query<UsuarioCreado>(
        `INSERT INTO usuario (nombres, apellidos, correo, contrasena_hash, estado, creado_por)
         VALUES ($1, $2, $3, $4, 'ACTIVA', $5)
         RETURNING id, nombres, apellidos, correo, estado`,
        [nuevo.nombres, nuevo.apellidos, nuevo.correo, nuevo.contrasenaHash, nuevo.creadoPor],
      );
      return rows[0];
    } catch (error) {
      if ((error as { code?: string }).code === VIOLACION_UNICA) throw new CorreoDuplicadoError();
      throw error;
    }
  }

  /** Datos para verificar el ingreso (RF-M1-02). Incluye el hash: nunca se devuelve al cliente. */
  async buscarParaIngreso(consultor: Consultor, correo: string): Promise<UsuarioParaIngreso | null> {
    const { rows } = await consultor.query<UsuarioParaIngreso>(
      `SELECT u.id, u.nombres || ' ' || u.apellidos AS nombre, u.estado,
              u.contrasena_hash AS "contrasenaHash",
              COALESCE(array_agg(r.codigo) FILTER (WHERE r.id IS NOT NULL), '{}') AS roles
       FROM usuario u
       LEFT JOIN usuario_rol ur ON ur.usuario_id = u.id
       LEFT JOIN rol r ON r.id = ur.rol_id
       WHERE lower(u.correo) = lower($1)
       GROUP BY u.id`,
      [correo],
    );
    return rows[0] ?? null;
  }

  async registrarIngreso(consultor: Consultor, usuarioId: number): Promise<void> {
    await consultor.query(`UPDATE usuario SET ultimo_ingreso_en = now() WHERE id = $1`, [usuarioId]);
  }

  /** Permisos de un rol (tabla rol_permiso, RF-M1-07). */
  async permisosDeRol(consultor: Consultor, rol: Rol): Promise<string[]> {
    const { rows } = await consultor.query<{ codigo: string }>(
      `SELECT DISTINCT pe.codigo
       FROM rol r
       JOIN rol_permiso rp ON rp.rol_id = r.id
       JOIN permiso pe ON pe.id = rp.permiso_id
       WHERE r.codigo = $1
       ORDER BY pe.codigo`,
      [rol],
    );
    return rows.map((fila) => fila.codigo);
  }

  async asignarRol(consultor: Consultor, usuarioId: number, rol: Rol, asignadoPor: number | null): Promise<void> {
    await consultor.query(
      `INSERT INTO usuario_rol (usuario_id, rol_id, asignado_por)
       SELECT $1, r.id, $3 FROM rol r WHERE r.codigo = $2`,
      [usuarioId, rol, asignadoPor],
    );
  }
}
