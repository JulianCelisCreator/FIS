import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditoriaRepository } from '../../../common/auditoria/auditoria.repository.js';
import type { UsuarioAutenticado } from '../../../common/auth/usuario-autenticado.js';
import { BaseDatosService } from '../../../common/database/base-datos.service.js';
import type { FiltrosCuentasDto } from '../dto/filtros-cuentas.dto.js';
import { type CuentaListada, UsuariosRepository } from '../repositories/usuarios.repository.js';
import { exigirAdministrador } from '../validators/administrador.validator.js';

export const MENSAJE_CUENTA_NO_EXISTE = 'La cuenta no existe.';
export const MENSAJE_YA_DESACTIVADA = 'La cuenta ya está desactivada.';
export const MENSAJE_NO_DESACTIVADA = 'Solo se puede reactivar una cuenta desactivada.';
export const MENSAJE_PROPIA_CUENTA = 'No puedes desactivar tu propia cuenta.';

export interface PaginaCuentas {
  cuentas: CuentaListada[];
  total: number;
  pagina: number;
  tamano: number;
}

/**
 * HU-M1-05 · Gestión de usuarios y cuentas (RF-M1-05). El Administrador ve
 * todas las cuentas, las desactiva y las reactiva. Desactivar es un cambio de
 * estado, nunca un borrado: la cuenta conserva sus datos e historial. Quién y
 * cuándo lo hizo queda en la auditoría.
 */
@Injectable()
export class GestionCuentasService {
  constructor(
    private readonly baseDatos: BaseDatosService,
    private readonly usuarios: UsuariosRepository,
    private readonly auditoria: AuditoriaRepository,
  ) {}

  /** CA-01: listado con búsqueda, filtros por rol y estado, y paginación en el servidor. */
  async listar(administrador: UsuarioAutenticado, filtros: FiltrosCuentasDto): Promise<PaginaCuentas> {
    exigirAdministrador(administrador);
    const { cuentas, total } = await this.usuarios.listar(this.baseDatos.consultor, {
      buscar: filtros.buscar || undefined,
      rol: filtros.rol,
      estado: filtros.estado,
      limite: filtros.tamano,
      desplazamiento: (filtros.pagina - 1) * filtros.tamano,
    });
    return { cuentas, total, pagina: filtros.pagina, tamano: filtros.tamano };
  }

  /**
   * CA-03: la cuenta pasa a desactivada y ya no puede iniciar sesión. Como el
   * guard relee la cuenta en cada solicitud, una sesión abierta deja de valer
   * en el siguiente clic. El Administrador no puede desactivarse a sí mismo,
   * así que el club nunca queda sin un Administrador activo.
   */
  async desactivar(administrador: UsuarioAutenticado, usuarioId: number): Promise<CuentaListada> {
    exigirAdministrador(administrador);
    if (usuarioId === administrador.id) throw new ConflictException(MENSAJE_PROPIA_CUENTA);

    return this.baseDatos.transaccion(async (consultor) => {
      const cuenta = await this.usuarios.buscarParaActualizar(consultor, usuarioId);
      if (!cuenta) throw new NotFoundException(MENSAJE_CUENTA_NO_EXISTE);
      if (cuenta.estado === 'DESACTIVADA') throw new ConflictException(MENSAJE_YA_DESACTIVADA);

      await this.usuarios.cambiarEstado(consultor, usuarioId, 'DESACTIVADA');
      await this.auditoria.registrar(consultor, {
        modulo: 'M1',
        tabla: 'usuario',
        registroId: usuarioId,
        accion: 'DESACTIVAR',
        valorAnterior: { estado: cuenta.estado },
        valorNuevo: { estado: 'DESACTIVADA' },
        usuarioId: administrador.id,
      });
      return { ...cuenta, estado: 'DESACTIVADA' };
    });
  }

  /**
   * CA-04: la cuenta vuelve al estado que tenía antes de desactivarse (decisión
   * del equipo): «Activa», o «Por registrar» si nunca se activó. Sin registro
   * en la auditoría, vuelve a «Activa».
   */
  async reactivar(administrador: UsuarioAutenticado, usuarioId: number): Promise<CuentaListada> {
    exigirAdministrador(administrador);

    return this.baseDatos.transaccion(async (consultor) => {
      const cuenta = await this.usuarios.buscarParaActualizar(consultor, usuarioId);
      if (!cuenta) throw new NotFoundException(MENSAJE_CUENTA_NO_EXISTE);
      if (cuenta.estado !== 'DESACTIVADA') throw new ConflictException(MENSAJE_NO_DESACTIVADA);

      const estado = (await this.usuarios.estadoAntesDeDesactivar(consultor, usuarioId)) ?? 'ACTIVA';
      await this.usuarios.cambiarEstado(consultor, usuarioId, estado);
      await this.auditoria.registrar(consultor, {
        modulo: 'M1',
        tabla: 'usuario',
        registroId: usuarioId,
        accion: 'REACTIVAR',
        valorAnterior: { estado: 'DESACTIVADA' },
        valorNuevo: { estado },
        usuarioId: administrador.id,
      });
      return { ...cuenta, estado };
    });
  }
}
