import { BadRequestException, Injectable } from '@nestjs/common';
import { AuditoriaRepository } from '../../../common/auditoria/auditoria.repository.js';
import { hashTokenSesion } from '../../../common/auth/token-sesion.js';
import type { UsuarioAutenticado } from '../../../common/auth/usuario-autenticado.js';
import { BaseDatosService } from '../../../common/database/base-datos.service.js';
import { SesionesRepository } from '../repositories/sesiones.repository.js';
import { UsuariosRepository } from '../repositories/usuarios.repository.js';
import { hashContrasena, verificarContrasena } from '../utils/contrasena.js';
import { reglasIncumplidas } from '../utils/politica-contrasena.js';

export const MENSAJE_ACTUAL_INCORRECTA = 'La contraseña actual no es correcta.';
export const MENSAJE_IGUAL_A_ACTUAL = 'La nueva contraseña debe ser distinta de la actual.';

/**
 * HU-M1-08 CA-05 · Cambio de contraseña desde «Mi cuenta». Como recomienda la
 * historia (decisión del equipo), exige la contraseña actual y, al cambiarla,
 * cierra las demás sesiones de la cuenta; la sesión desde la que se cambia
 * sigue abierta.
 */
@Injectable()
export class CambioContrasenaService {
  constructor(
    private readonly baseDatos: BaseDatosService,
    private readonly usuarios: UsuariosRepository,
    private readonly sesiones: SesionesRepository,
    private readonly auditoria: AuditoriaRepository,
  ) {}

  async cambiar(
    usuario: UsuarioAutenticado,
    tokenSesion: string | null,
    actual: string,
    nueva: string,
  ): Promise<{ mensaje: string; sesionesCerradas: number }> {
    const faltan = reglasIncumplidas(nueva);
    if (faltan.length > 0) throw new BadRequestException(faltan); // CA-04

    const hashActual = await this.usuarios.obtenerContrasenaHash(this.baseDatos.consultor, usuario.id);
    if (!hashActual || !(await verificarContrasena(actual, hashActual))) {
      throw new BadRequestException(MENSAJE_ACTUAL_INCORRECTA);
    }
    if (actual === nueva) throw new BadRequestException(MENSAJE_IGUAL_A_ACTUAL);

    const nuevoHash = await hashContrasena(nueva);
    const sesionesCerradas = await this.baseDatos.transaccion(async (consultor) => {
      await this.usuarios.actualizarContrasena(consultor, usuario.id, nuevoHash);
      const cerradas = await this.sesiones.cerrarDeUsuario(
        consultor,
        usuario.id,
        tokenSesion ? hashTokenSesion(tokenSesion) : null,
      );
      await this.auditoria.registrar(consultor, {
        modulo: 'M1',
        tabla: 'usuario',
        registroId: usuario.id,
        accion: 'CAMBIAR_CONTRASENA',
        valorNuevo: { sesionesCerradas: cerradas },
        usuarioId: usuario.id,
      });
      return cerradas;
    });

    return {
      mensaje:
        sesionesCerradas > 0
          ? `Tu contraseña se actualizó. Cerramos tu sesión en ${sesionesCerradas === 1 ? 'otro dispositivo' : `${sesionesCerradas} dispositivos más`}.`
          : 'Tu contraseña se actualizó.',
      sesionesCerradas,
    };
  }
}
