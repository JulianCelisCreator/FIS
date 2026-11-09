import { ConflictException, Injectable } from '@nestjs/common';
import { AuditoriaRepository } from '../../../common/auditoria/auditoria.repository.js';
import { BaseDatosService } from '../../../common/database/base-datos.service.js';
import type { RegistrarUsuarioDto } from '../dto/registrar-usuario.dto.js';
import { CorreoDuplicadoError, UsuariosRepository } from '../repositories/usuarios.repository.js';
import { hashContrasena } from '../utils/contrasena.js';

export const MENSAJE_CORREO_DUPLICADO =
  'Ya existe una cuenta con este correo. Ingresa con tu contraseña o recupérala.';

/** Respuesta del registro: nunca incluye la contraseña ni su hash. */
export interface CuentaRegistrada {
  id: number;
  nombre: string;
  correo: string;
  rol: RegistrarUsuarioDto['rol'];
  estado: 'POR_REGISTRAR' | 'ACTIVA' | 'DESACTIVADA';
  /** El correo queda «Pendiente de verificación» hasta RF-M1-04. */
  correoVerificado: false;
}

/**
 * RF-M1-01 · Registro de usuario. La persona crea su cuenta con uno de los
 * roles de autorregistro; el correo es único sin distinguir mayúsculas.
 */
@Injectable()
export class RegistroService {
  constructor(
    private readonly baseDatos: BaseDatosService,
    private readonly usuarios: UsuariosRepository,
    private readonly auditoria: AuditoriaRepository,
  ) {}

  async registrar(dto: RegistrarUsuarioDto): Promise<CuentaRegistrada> {
    if (await this.usuarios.existeCorreo(this.baseDatos.consultor, dto.correo)) {
      throw new ConflictException(MENSAJE_CORREO_DUPLICADO);
    }
    const contrasenaHash = await hashContrasena(dto.contrasena);

    try {
      return await this.baseDatos.transaccion(async (consultor) => {
        const usuario = await this.usuarios.crear(consultor, {
          nombres: dto.nombres,
          apellidos: dto.apellidos,
          correo: dto.correo,
          contrasenaHash,
          creadoPor: null,
        });
        await this.usuarios.asignarRol(consultor, usuario.id, dto.rol, null);
        await this.auditoria.registrar(consultor, {
          modulo: 'M1',
          tabla: 'usuario',
          registroId: usuario.id,
          accion: 'REGISTRAR',
          valorNuevo: { correo: usuario.correo, rol: dto.rol, origen: 'AUTORREGISTRO' },
          usuarioId: usuario.id,
        });
        return {
          id: usuario.id,
          nombre: `${usuario.nombres} ${usuario.apellidos}`,
          correo: usuario.correo,
          rol: dto.rol,
          estado: usuario.estado,
          correoVerificado: false,
        };
      });
    } catch (error) {
      if (error instanceof CorreoDuplicadoError) throw new ConflictException(MENSAJE_CORREO_DUPLICADO);
      throw error;
    }
  }
}
