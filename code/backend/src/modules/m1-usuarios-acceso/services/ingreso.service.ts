import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { crearTokenSesion, DURACION_SESION_MS, hashTokenSesion } from '../../../common/auth/token-sesion.js';
import type { Rol } from '../../../common/auth/usuario-autenticado.js';
import { BaseDatosService } from '../../../common/database/base-datos.service.js';
import type { IniciarSesionDto } from '../dto/iniciar-sesion.dto.js';
import { SesionesRepository } from '../repositories/sesiones.repository.js';
import { UsuariosRepository } from '../repositories/usuarios.repository.js';
import { hashContrasena, verificarContrasena } from '../utils/contrasena.js';

export const MENSAJE_CREDENCIALES = 'El correo o la contraseña no son correctos.';
export const MENSAJE_CUENTA_DESACTIVADA = 'Tu cuenta está desactivada. Comunícate con la escuela.';
export const MENSAJE_CUENTA_POR_ACTIVAR = 'Tu cuenta aún no está activa. Comunícate con la escuela.';

const NOMBRE_ROL: Record<Rol, string> = {
  ADMINISTRADOR: 'Administrador',
  PROFESOR: 'Profesor',
  PATINADOR: 'Patinador',
  ACUDIENTE: 'Acudiente',
  CONTADOR: 'Contador',
  FISIOTERAPEUTA: 'Fisioterapeuta',
  VISITANTE: 'Visitante',
};

export function mensajeSinRol(rol: Rol): string {
  return `Tu cuenta no tiene el rol ${NOMBRE_ROL[rol]}. Elige el rol con el que te registraste.`;
}

export interface ContextoIngreso {
  ip: string | null;
  userAgent: string | null;
}

/** Resultado del ingreso: el token va solo en la cookie; el resto es para la interfaz. */
export interface SesionIniciada {
  token: string;
  expiraEn: Date;
  sesion: { id: number; nombre: string; roles: Rol[]; permisos: string[] };
}

/**
 * RF-M1-02 · Inicio de sesión con correo, contraseña y rol. RF-M1-03 · Cierre.
 * Un correo que no existe y una contraseña equivocada dan el mismo mensaje y
 * tardan lo mismo, para no revelar qué correos tienen cuenta.
 */
@Injectable()
export class IngresoService {
  /** Hash de referencia para comparar cuando el correo no existe. */
  private hashFicticio: Promise<string> | null = null;

  constructor(
    private readonly baseDatos: BaseDatosService,
    private readonly usuarios: UsuariosRepository,
    private readonly sesiones: SesionesRepository,
  ) {}

  async iniciar(dto: IniciarSesionDto, contexto: ContextoIngreso): Promise<SesionIniciada> {
    const consultor = this.baseDatos.consultor;
    const usuario = await this.usuarios.buscarParaIngreso(consultor, dto.correo);

    if (!usuario) {
      this.hashFicticio ??= hashContrasena('contrasena-de-referencia');
      await verificarContrasena(dto.contrasena, await this.hashFicticio);
      throw new UnauthorizedException(MENSAJE_CREDENCIALES);
    }
    if (!(await verificarContrasena(dto.contrasena, usuario.contrasenaHash))) {
      throw new UnauthorizedException(MENSAJE_CREDENCIALES);
    }
    // Desde aquí la persona demostró ser dueña de la cuenta: los mensajes pueden ser específicos.
    if (usuario.estado === 'DESACTIVADA') throw new ForbiddenException(MENSAJE_CUENTA_DESACTIVADA);
    if (usuario.estado !== 'ACTIVA') throw new ForbiddenException(MENSAJE_CUENTA_POR_ACTIVAR);
    if (!usuario.roles.includes(dto.rol)) throw new ForbiddenException(mensajeSinRol(dto.rol));

    const { token, hash } = crearTokenSesion(dto.rol);
    const expiraEn = new Date(Date.now() + DURACION_SESION_MS);

    return this.baseDatos.transaccion(async (cliente) => {
      await this.sesiones.crear(cliente, {
        usuarioId: usuario.id,
        tokenHash: hash,
        expiraEn,
        ip: contexto.ip,
        userAgent: contexto.userAgent?.slice(0, 500) ?? null,
      });
      await this.usuarios.registrarIngreso(cliente, usuario.id);
      const permisos = await this.usuarios.permisosDeRol(cliente, dto.rol);
      return {
        token,
        expiraEn,
        sesion: { id: usuario.id, nombre: usuario.nombre, roles: [dto.rol], permisos },
      };
    });
  }

  /** Cierra la sesión del token. Si no hay token o ya estaba cerrada, no falla. */
  async cerrar(token: string | null): Promise<void> {
    if (!token) return;
    await this.sesiones.cerrarPorToken(this.baseDatos.consultor, hashTokenSesion(token));
  }
}
