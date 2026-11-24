import { Injectable } from '@nestjs/common';
import type { Rol } from '../../../common/auth/usuario-autenticado.js';
import { BaseDatosService, type Consultor } from '../../../common/database/base-datos.service.js';
import type { DisponibilidadPersonalM6 } from '../../../external-dependencies/interfaces/external-dependencies.interfaces.js';
import { UsuariosRepository } from '../../m1-usuarios-acceso/repositories/usuarios.repository.js';
import type {
  Cargo,
  CrearPersonalDto,
  EditarPersonalDto,
  EstadoPersonal,
  FiltrosPersonalDto,
  TipoDocumento,
} from '../dto/personal.dto.js';
import type { CuentaVinculable } from '../utils/reglas-personal.js';

/** Cuenta de M1 vinculada a la ficha laboral. */
export interface CuentaPersonal {
  id: number;
  correo: string;
  estado: string;
  roles: string[];
}

export interface Personal {
  id: number;
  tipoDocumento: TipoDocumento;
  numeroDocumento: string;
  nombres: string;
  apellidos: string;
  correo: string;
  telefono: string;
  cargo: Cargo;
  estado: EstadoPersonal;
  fechaIngreso: string;
  fechaRetiro: string | null;
  cuenta: CuentaPersonal | null;
}

export interface PaginaPersonal {
  datos: Personal[];
  total: number;
  pagina: number;
  tamano: number;
}

/** Cuenta de M1 que se puede ofrecer para vincular. */
export interface CuentaDisponible {
  id: number;
  nombre: string;
  correo: string;
  estado: string;
  roles: string[];
}

const COLUMNAS = `
  p.id, p.tipo_documento AS "tipoDocumento", p.numero_documento AS "numeroDocumento",
  p.nombres, p.apellidos, p.correo_institucional AS correo, p.telefono, p.cargo, p.estado,
  to_char(p.fecha_ingreso, 'YYYY-MM-DD') AS "fechaIngreso",
  to_char(p.fecha_retiro, 'YYYY-MM-DD') AS "fechaRetiro",
  CASE WHEN u.id IS NULL THEN NULL ELSE json_build_object(
    'id', u.id, 'correo', u.correo, 'estado', u.estado,
    'roles', COALESCE((SELECT json_agg(r.codigo ORDER BY r.codigo)
                       FROM usuario_rol ur JOIN rol r ON r.id = ur.rol_id
                       WHERE ur.usuario_id = u.id), '[]'::json)
  ) END AS cuenta`;

/** Ficha laboral del personal (HU-6.2). Las credenciales y roles son de M1. */
@Injectable()
export class PersonalRepository {
  constructor(
    private readonly baseDatos: BaseDatosService,
    private readonly usuariosM1: UsuariosRepository,
  ) {}

  async listar(filtros: FiltrosPersonalDto): Promise<PaginaPersonal> {
    const condiciones: string[] = [];
    const parametros: unknown[] = [];
    if (filtros.buscar?.trim()) {
      parametros.push(`%${filtros.buscar.trim()}%`);
      const n = parametros.length;
      condiciones.push(
        `(p.numero_documento ILIKE $${n} OR (p.nombres || ' ' || p.apellidos) ILIKE $${n})`,
      );
    }
    if (filtros.estado) {
      parametros.push(filtros.estado);
      condiciones.push(`p.estado = $${parametros.length}`);
    }
    if (filtros.cargo) {
      parametros.push(filtros.cargo);
      condiciones.push(`p.cargo = $${parametros.length}`);
    }
    const where = condiciones.length > 0 ? `WHERE ${condiciones.join(' AND ')}` : '';

    const [{ total }] = await this.baseDatos.consultar<{ total: number }>(
      `SELECT count(*)::int AS total FROM personal p ${where}`,
      parametros,
    );
    const pagina = filtros.pagina ?? 1;
    const tamano = filtros.tamano ?? 20;
    const datos = await this.baseDatos.consultar<Personal>(
      `SELECT ${COLUMNAS}
       FROM personal p
       LEFT JOIN usuario u ON u.id = p.usuario_id
       ${where}
       ORDER BY p.estado, p.apellidos, p.nombres, p.id
       LIMIT $${parametros.length + 1} OFFSET $${parametros.length + 2}`,
      [...parametros, tamano, (pagina - 1) * tamano],
    );
    return { datos, total, pagina, tamano };
  }

  async detalle(id: number, consultor: Consultor = this.baseDatos.consultor): Promise<Personal | null> {
    const [fila] = await consultor
      .query<Personal>(
        `SELECT ${COLUMNAS}
         FROM personal p LEFT JOIN usuario u ON u.id = p.usuario_id
         WHERE p.id = $1`,
        [id],
      )
      .then((resultado) => resultado.rows);
    return fila ?? null;
  }

  /** Bloquea la fila para cambios de estado o de rol dentro de una transacción. */
  async bloquear(id: number, consultor: Consultor) {
    const [fila] = await consultor
      .query<{ id: number; estado: EstadoPersonal; usuarioId: number | null }>(
        `SELECT id, estado, usuario_id AS "usuarioId" FROM personal WHERE id = $1 FOR UPDATE`,
        [id],
      )
      .then((resultado) => resultado.rows);
    return fila ?? null;
  }

  async cuenta(usuarioId: number, consultor: Consultor): Promise<CuentaVinculable | null> {
    const [fila] = await consultor
      .query<CuentaVinculable>(
        `SELECT u.id, u.estado, p.id AS "personalId"
         FROM usuario u LEFT JOIN personal p ON p.usuario_id = u.id
         WHERE u.id = $1`,
        [usuarioId],
      )
      .then((resultado) => resultado.rows);
    return fila ?? null;
  }

  /** Cuentas de M1 no desactivadas y sin ficha laboral, para vincular por correo o nombre. */
  cuentasDisponibles(buscar?: string): Promise<CuentaDisponible[]> {
    const texto = buscar?.trim() ? `%${buscar.trim()}%` : '%';
    return this.baseDatos.consultar<CuentaDisponible>(
      `SELECT u.id, u.nombres || ' ' || u.apellidos AS nombre, u.correo, u.estado,
              COALESCE(array_agg(r.codigo ORDER BY r.codigo) FILTER (WHERE r.id IS NOT NULL), '{}') AS roles
       FROM usuario u
       LEFT JOIN usuario_rol ur ON ur.usuario_id = u.id
       LEFT JOIN rol r ON r.id = ur.rol_id
       WHERE u.estado <> 'DESACTIVADA'
         AND NOT EXISTS (SELECT 1 FROM personal p WHERE p.usuario_id = u.id)
         AND (u.correo ILIKE $1 OR (u.nombres || ' ' || u.apellidos) ILIKE $1)
       GROUP BY u.id
       ORDER BY u.correo
       LIMIT 20`,
      [texto],
    );
  }

  async crear(dto: CrearPersonalDto, consultor: Consultor): Promise<number> {
    const [fila] = await consultor
      .query<{ id: number }>(
        `INSERT INTO personal
         (usuario_id, tipo_documento, numero_documento, nombres, apellidos,
          correo_institucional, telefono, cargo)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id`,
        [
          dto.usuarioId ?? null,
          dto.tipoDocumento,
          dto.numeroDocumento,
          dto.nombres,
          dto.apellidos,
          dto.correo,
          dto.telefono,
          dto.cargo,
        ],
      )
      .then((resultado) => resultado.rows);
    return fila.id;
  }

  async editar(id: number, dto: EditarPersonalDto, consultor: Consultor): Promise<boolean> {
    const resultado = await consultor.query(
      `UPDATE personal SET
         tipo_documento = COALESCE($1, tipo_documento),
         numero_documento = COALESCE($2, numero_documento),
         nombres = COALESCE($3, nombres),
         apellidos = COALESCE($4, apellidos),
         correo_institucional = COALESCE($5, correo_institucional),
         telefono = COALESCE($6, telefono),
         cargo = COALESCE($7, cargo),
         usuario_id = CASE WHEN $8 THEN $9::bigint ELSE usuario_id END,
         actualizado_en = now()
       WHERE id = $10`,
      [
        dto.tipoDocumento ?? null,
        dto.numeroDocumento ?? null,
        dto.nombres ?? null,
        dto.apellidos ?? null,
        dto.correo ?? null,
        dto.telefono ?? null,
        dto.cargo ?? null,
        dto.usuarioId !== undefined,
        dto.usuarioId ?? null,
        id,
      ],
    );
    return (resultado.rowCount ?? 0) > 0;
  }

  /** Estado de la cuenta vinculada y sus roles, bloqueando sus filas de rol. */
  async cuentaConRoles(usuarioId: number, consultor: Consultor) {
    const [fila] = await consultor
      .query<{ estado: string; roles: string[] }>(
        `SELECT u.estado,
                COALESCE(array_agg(r.codigo) FILTER (WHERE r.id IS NOT NULL), '{}') AS roles
         FROM usuario u
         LEFT JOIN usuario_rol ur ON ur.usuario_id = u.id
         LEFT JOIN rol r ON r.id = ur.rol_id
         WHERE u.id = $1
         GROUP BY u.id`,
        [usuarioId],
      )
      .then((resultado) => resultado.rows);
    return fila ?? null;
  }

  async asignarRol(usuarioId: number, rol: Rol, asignadoPor: number, consultor: Consultor) {
    await this.usuariosM1.asignarRol(consultor, usuarioId, rol, asignadoPor);
  }

  /** DEP-M6-01: disponibilidad y horarios asignados (M3) del personal docente. */
  async disponibilidadDocentes(personalId?: number): Promise<DisponibilidadPersonalM6[]> {
    const filas = await this.baseDatos.consultar<{
      id: number;
      cargo: string;
      estado: EstadoPersonal;
      bloques: NonNullable<DisponibilidadPersonalM6['bloquesOcupadosExternos']>;
    }>(
      `SELECT p.id, p.cargo, p.estado,
              COALESCE((
                SELECT json_agg(json_build_object(
                  'diaSemana', CASE h.dia_semana
                    WHEN 1 THEN 'Lunes' WHEN 2 THEN 'Martes' WHEN 3 THEN 'Miercoles'
                    WHEN 4 THEN 'Jueves' WHEN 5 THEN 'Viernes' WHEN 6 THEN 'Sabado' ELSE 'Domingo' END,
                  'horaInicio', to_char(h.hora_inicio, 'HH24:MI'),
                  'horaFin', to_char(h.hora_fin, 'HH24:MI'),
                  'motivo', g.nombre
                ) ORDER BY h.dia_semana, h.hora_inicio)
                FROM grupo_profesor gp
                JOIN grupo g ON g.id = gp.grupo_id AND g.activo
                JOIN horario h ON h.grupo_id = g.id AND h.activo
                WHERE gp.profesor_id = p.usuario_id AND gp.hasta IS NULL
              ), '[]'::json) AS bloques
       FROM personal p
       WHERE p.cargo = 'PROFESOR'
         ${personalId === undefined ? '' : 'AND p.id = $1'}
       ORDER BY p.id`,
      personalId === undefined ? [] : [personalId],
    );
    const dias = ['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'] as const;
    return filas.map((fila) => ({
      personalId: String(fila.id),
      cargo: fila.cargo,
      estadoContrato: fila.estado === 'ACTIVO' ? 'ACTIVO' : 'FINALIZADO',
      disponibilidad: dias.map((diaSemana) => ({ diaSemana, horaInicio: '07:00', horaFin: '19:00' })),
      bloquesOcupadosExternos: fila.bloques,
    }));
  }

  /** Retira un rol de la cuenta. Devuelve si la cuenta lo tenía. */
  async retirarRol(usuarioId: number, rol: string, consultor: Consultor): Promise<boolean> {
    const resultado = await consultor.query(
      `DELETE FROM usuario_rol
       WHERE usuario_id = $1 AND rol_id = (SELECT id FROM rol WHERE codigo = $2)`,
      [usuarioId, rol],
    );
    return (resultado.rowCount ?? 0) > 0;
  }

  /** Desactivar o reactivar sin borrar nada: el estado va con la fecha de retiro. */
  async cambiarEstado(id: number, estado: EstadoPersonal, consultor: Consultor): Promise<void> {
    await consultor.query(
      `UPDATE personal
       SET estado = $1::text,
           fecha_retiro = CASE WHEN $1::text = 'INACTIVO' THEN current_date ELSE NULL END,
           actualizado_en = now()
       WHERE id = $2`,
      [estado, id],
    );
  }
}
