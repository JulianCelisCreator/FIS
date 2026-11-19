import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditoriaRepository } from '../../../common/auditoria/auditoria.repository.js';
import type { Rol, UsuarioAutenticado } from '../../../common/auth/usuario-autenticado.js';
import { BaseDatosService } from '../../../common/database/base-datos.service.js';
import { type CuentaListada, UsuariosRepository } from '../repositories/usuarios.repository.js';
import { exigirAdministrador } from '../validators/administrador.validator.js';
import { MENSAJE_CUENTA_NO_EXISTE } from './gestion-cuentas.service.js';

export const MENSAJE_PROPIO_ROL = 'No puedes cambiar tu propio rol.';
export const MENSAJE_MISMO_ROL = 'La cuenta ya tiene ese rol.';

/**
 * HU-M1-06 · Gestión de roles de usuario (RF-M1-06). El Administrador asigna
 * o cambia el rol de una cuenta; el nuevo reemplaza al anterior. Como el
 * guard relee los roles en cada solicitud, los nuevos permisos rigen de
 * inmediato (CA-03). El Administrador no puede cambiar su propio rol, así que
 * el club nunca queda sin un Administrador.
 */
@Injectable()
export class RolesService {
  constructor(
    private readonly baseDatos: BaseDatosService,
    private readonly usuarios: UsuariosRepository,
    private readonly auditoria: AuditoriaRepository,
  ) {}

  async cambiar(administrador: UsuarioAutenticado, usuarioId: number, rol: Rol): Promise<CuentaListada> {
    exigirAdministrador(administrador); // CA-05
    if (usuarioId === administrador.id) throw new ConflictException(MENSAJE_PROPIO_ROL);

    return this.baseDatos.transaccion(async (consultor) => {
      const cuenta = await this.usuarios.buscarParaActualizar(consultor, usuarioId);
      if (!cuenta) throw new NotFoundException(MENSAJE_CUENTA_NO_EXISTE);
      if (cuenta.roles.length === 1 && cuenta.roles[0] === rol) throw new ConflictException(MENSAJE_MISMO_ROL);

      await this.usuarios.reemplazarRoles(consultor, usuarioId, rol, administrador.id);
      await this.auditoria.registrar(consultor, {
        modulo: 'M1',
        tabla: 'usuario',
        registroId: usuarioId,
        accion: 'CAMBIAR_ROL',
        valorAnterior: { roles: cuenta.roles },
        valorNuevo: { roles: [rol] },
        usuarioId: administrador.id,
      });
      return { ...cuenta, roles: [rol] };
    });
  }
}
