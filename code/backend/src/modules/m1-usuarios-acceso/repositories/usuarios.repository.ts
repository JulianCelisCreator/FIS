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

export interface UsuarioParaIngreso {
  id: number;
  nombre: string;
  estado: 'POR_REGISTRAR' | 'ACTIVA' | 'DESACTIVADA';
  contrasenaHash: string;
}

export type EstadoUsuario = 'POR_REGISTRAR' | 'ACTIVA' | 'DESACTIVADA';

/** Fila del listado «Usuarios» (HU-M1-05). */
export interface CuentaListada {
  id: number;
  nombre: string;
  correo: string;
  roles: Rol[];
  estado: EstadoUsuario;
  ultimoIngresoEn: Date | null;
}

export interface FiltrosListadoCuentas {
  buscar?: string;
  rol?: Rol;
  estado?: EstadoUsuario;
  limite: number;
  desplazamiento: number;
}

/** Escapa los comodines de LIKE para que la búsqueda trate % y _ como texto. */
function patronBusqueda(texto: string): string {
  return `%${texto.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
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

  /** Datos para verificar el ingreso (HU-M1-02). Incluye el hash: nunca se devuelve al cliente. */
  async buscarParaIngreso(consultor: Consultor, correo: string): Promise<UsuarioParaIngreso | null> {
    const { rows } = await consultor.query<UsuarioParaIngreso>(
      `SELECT id, nombres || ' ' || apellidos AS nombre, estado, contrasena_hash AS "contrasenaHash"
       FROM usuario
       WHERE lower(correo) = lower($1)`,
      [correo],
    );
    return rows[0] ?? null;
  }

  /** Roles de la cuenta y los permisos de esos roles (CA-04: solo lo autorizado para su rol). */
  async rolesYPermisos(consultor: Consultor, usuarioId: number): Promise<{ roles: Rol[]; permisos: string[] }> {
    const { rows } = await consultor.query<{ roles: Rol[]; permisos: string[] }>(
      `SELECT COALESCE(array_agg(DISTINCT r.codigo) FILTER (WHERE r.id IS NOT NULL), '{}') AS roles,
              COALESCE(array_agg(DISTINCT pe.codigo) FILTER (WHERE pe.id IS NOT NULL), '{}') AS permisos
       FROM usuario_rol ur
       JOIN rol r               ON r.id = ur.rol_id
       LEFT JOIN rol_permiso rp ON rp.rol_id = r.id
       LEFT JOIN permiso pe     ON pe.id = rp.permiso_id
       WHERE ur.usuario_id = $1`,
      [usuarioId],
    );
    return rows[0] ?? { roles: [], permisos: [] };
  }

  async registrarIngreso(consultor: Consultor, usuarioId: number): Promise<void> {
    await consultor.query(`UPDATE usuario SET ultimo_ingreso_en = now() WHERE id = $1`, [usuarioId]);
  }

  /**
   * HU-M1-05 CA-01: cuentas filtradas y paginadas en el servidor, con el total
   * de coincidencias para la paginación. Orden estable por nombre e id.
   */
  async listar(consultor: Consultor, filtros: FiltrosListadoCuentas): Promise<{ cuentas: CuentaListada[]; total: number }> {
    const { rows } = await consultor.query<CuentaListada & { total: number }>(
      `SELECT u.id, u.nombres || ' ' || u.apellidos AS nombre, u.correo, u.estado,
              u.ultimo_ingreso_en AS "ultimoIngresoEn",
              COALESCE(array_agg(r.codigo ORDER BY r.codigo) FILTER (WHERE r.id IS NOT NULL), '{}') AS roles,
              count(*) OVER () AS total
       FROM usuario u
       LEFT JOIN usuario_rol ur ON ur.usuario_id = u.id
       LEFT JOIN rol r          ON r.id = ur.rol_id
       WHERE ($1::text IS NULL
              OR (u.nombres || ' ' || u.apellidos) ILIKE $1 ESCAPE '\\'
              OR u.correo ILIKE $1 ESCAPE '\\')
         AND ($2::text IS NULL OR u.estado = $2)
         AND ($3::text IS NULL OR EXISTS (
               SELECT 1 FROM usuario_rol ur2 JOIN rol r2 ON r2.id = ur2.rol_id
               WHERE ur2.usuario_id = u.id AND r2.codigo = $3))
       GROUP BY u.id
       ORDER BY u.nombres, u.apellidos, u.id
       LIMIT $4 OFFSET $5`,
      [
        filtros.buscar ? patronBusqueda(filtros.buscar) : null,
        filtros.estado ?? null,
        filtros.rol ?? null,
        filtros.limite,
        filtros.desplazamiento,
      ],
    );
    const total = rows[0]?.total ?? 0;
    return { cuentas: rows.map(({ total: _total, ...cuenta }) => cuenta), total };
  }

  /** Una cuenta con su estado y roles, bloqueada para actualizarla en la misma transacción. */
  async buscarParaActualizar(consultor: Consultor, usuarioId: number): Promise<CuentaListada | null> {
    const { rows } = await consultor.query<CuentaListada>(
      `SELECT u.id, u.nombres || ' ' || u.apellidos AS nombre, u.correo, u.estado,
              u.ultimo_ingreso_en AS "ultimoIngresoEn",
              COALESCE((SELECT array_agg(r.codigo ORDER BY r.codigo)
                        FROM usuario_rol ur JOIN rol r ON r.id = ur.rol_id
                        WHERE ur.usuario_id = u.id), '{}') AS roles
       FROM usuario u
       WHERE u.id = $1
       FOR UPDATE OF u`,
      [usuarioId],
    );
    return rows[0] ?? null;
  }

  async cambiarEstado(consultor: Consultor, usuarioId: number, estado: EstadoUsuario): Promise<void> {
    await consultor.query(`UPDATE usuario SET estado = $2 WHERE id = $1`, [usuarioId, estado]);
  }

  /**
   * Estado que tenía la cuenta antes de su última desactivación, según la
   * auditoría (HU-M1-05 CA-04: al reactivar vuelve a ese estado). null si no
   * hay registro, p. ej. si se desactivó por fuera de la aplicación.
   */
  async estadoAntesDeDesactivar(consultor: Consultor, usuarioId: number): Promise<EstadoUsuario | null> {
    const { rows } = await consultor.query<{ estado: EstadoUsuario | null }>(
      `SELECT valor_anterior->>'estado' AS estado
       FROM auditoria
       WHERE modulo = 'M1' AND tabla = 'usuario' AND registro_id = $1 AND accion = 'DESACTIVAR'
       ORDER BY creado_en DESC, id DESC
       LIMIT 1`,
      [usuarioId],
    );
    const estado = rows[0]?.estado ?? null;
    return estado === 'ACTIVA' || estado === 'POR_REGISTRAR' ? estado : null;
  }

  /**
   * HU-M1-06 CA-02: el nuevo rol reemplaza al anterior. Quitar un rol borra su
   * fila de usuario_rol (así lo define el esquema); el cambio queda en la
   * auditoría con los roles anteriores.
   */
  async reemplazarRoles(consultor: Consultor, usuarioId: number, rol: Rol, asignadoPor: number): Promise<void> {
    await consultor.query(`DELETE FROM usuario_rol WHERE usuario_id = $1`, [usuarioId]);
    await this.asignarRol(consultor, usuarioId, rol, asignadoPor);
  }

  async asignarRol(consultor: Consultor, usuarioId: number, rol: Rol, asignadoPor: number): Promise<void> {
    await consultor.query(
      `INSERT INTO usuario_rol (usuario_id, rol_id, asignado_por)
       SELECT $1, r.id, $3 FROM rol r WHERE r.codigo = $2`,
      [usuarioId, rol, asignadoPor],
    );
  }
}
