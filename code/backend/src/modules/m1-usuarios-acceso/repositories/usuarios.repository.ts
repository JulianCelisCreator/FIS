import { Injectable } from '@nestjs/common';
import type { Rol } from '../../../common/auth/usuario-autenticado.js';
import type { Consultor } from '../../../common/database/base-datos.service.js';

export interface NuevoUsuario {
  nombres: string;
  apellidos: string;
  correo: string;
  contrasenaHash: string;
  estado: 'POR_REGISTRAR' | 'ACTIVA';
  /** Administrador que crea la cuenta (HU-M1-01). */
  creadoPor: number;
}

export interface UsuarioCreado {
  id: number;
  nombres: string;
  apellidos: string;
  correo: string;
  estado: 'POR_REGISTRAR' | 'ACTIVA' | 'DESACTIVADA';
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

/** Cuentas de acceso (tablas usuario y usuario_rol, HU-M1-01). */
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
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, nombres, apellidos, correo, estado`,
        [nuevo.nombres, nuevo.apellidos, nuevo.correo, nuevo.contrasenaHash, nuevo.estado, nuevo.creadoPor],
      );
      return rows[0];
    } catch (error) {
      if ((error as { code?: string }).code === VIOLACION_UNICA) throw new CorreoDuplicadoError();
      throw error;
    }
  }

  async asignarRol(consultor: Consultor, usuarioId: number, rol: Rol, asignadoPor: number): Promise<void> {
    await consultor.query(
      `INSERT INTO usuario_rol (usuario_id, rol_id, asignado_por)
       SELECT $1, r.id, $3 FROM rol r WHERE r.codigo = $2`,
      [usuarioId, rol, asignadoPor],
    );
  }
}
