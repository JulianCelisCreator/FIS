import { ForbiddenException, Injectable } from '@nestjs/common';
import { BaseDatosService } from '../database/base-datos.service.js';
import type { Rol, UsuarioAutenticado } from './usuario-autenticado.js';

export interface UsuarioDePrueba {
  id: number;
  nombre: string;
  correo: string;
  roles: Rol[];
}

/**
 * TEMPORAL, mientras M1 implementa el inicio de sesión (M1-02): datos del
 * usuario actual y lista de usuarios para elegir con quién probar en desarrollo.
 */
@Injectable()
export class SesionService {
  constructor(private readonly baseDatos: BaseDatosService) {}

  async actual(usuario: UsuarioAutenticado) {
    const [fila] = await this.baseDatos.consultar<{ nombre: string }>(
      `SELECT nombres || ' ' || apellidos AS nombre FROM usuario WHERE id = $1`,
      [usuario.id],
    );
    return { ...usuario, nombre: fila.nombre };
  }

  async usuariosDePrueba(): Promise<UsuarioDePrueba[]> {
    if (process.env.NODE_ENV === 'production') {
      throw new ForbiddenException('La lista de usuarios de prueba no existe en producción');
    }
    return this.baseDatos.consultar<UsuarioDePrueba>(
      `SELECT u.id, u.nombres || ' ' || u.apellidos AS nombre, u.correo,
              COALESCE(array_agg(r.codigo ORDER BY r.codigo) FILTER (WHERE r.id IS NOT NULL), '{}') AS roles
       FROM usuario u
       LEFT JOIN usuario_rol ur ON ur.usuario_id = u.id
       LEFT JOIN rol r ON r.id = ur.rol_id
       WHERE u.estado = 'ACTIVA'
       GROUP BY u.id
       ORDER BY u.nombres, u.apellidos
       LIMIT 200`,
    );
  }
}
