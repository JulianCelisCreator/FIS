import { Injectable } from '@nestjs/common';
import { BaseDatosService } from '../database/base-datos.service.js';
import type { UsuarioAutenticado } from './usuario-autenticado.js';

/** Datos del usuario de la sesión actual para la interfaz (GET /sesion). */
@Injectable()
export class SesionService {
  constructor(private readonly baseDatos: BaseDatosService) {}

  async actual(usuario: UsuarioAutenticado) {
    const [fila] = await this.baseDatos.consultar<{ nombre: string }>(
      `SELECT nombres || ' ' || apellidos AS nombre FROM usuario WHERE id = $1`,
      [usuario.id],
    );
    return { id: usuario.id, nombre: fila.nombre, roles: usuario.roles, permisos: usuario.permisos };
  }
}
