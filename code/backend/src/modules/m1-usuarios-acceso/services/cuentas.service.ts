import { ConflictException, ForbiddenException, Injectable } from '@nestjs/common';
import { AuditoriaRepository } from '../../../common/auditoria/auditoria.repository.js';
import { Rol, type UsuarioAutenticado } from '../../../common/auth/usuario-autenticado.js';
import { BaseDatosService } from '../../../common/database/base-datos.service.js';
import type { CrearCuentaDto } from '../dto/crear-cuenta.dto.js';
import type { RolCuenta } from '../enums/rol-cuenta.enum.js';
import { CorreoDuplicadoError, UsuariosRepository } from '../repositories/usuarios.repository.js';
import { hashContrasena } from '../utils/contrasena.js';
import { generarContrasenaTemporal } from '../utils/contrasena-temporal.js';

export const MENSAJE_CORREO_DUPLICADO = 'Este correo ya está en uso por otra cuenta.';
export const MENSAJE_SOLO_ADMINISTRADOR = 'Solo el Administrador puede crear cuentas.';

/** Respuesta de la creación. La contraseña temporal se entrega solo aquí y una sola vez. */
export interface CuentaCreada {
  id: number;
  nombre: string;
  correo: string;
  rol: RolCuenta;
  estado: 'POR_REGISTRAR';
  contrasenaTemporal: string;
}

/**
 * HU-M1-01 · Registro de usuario por el Administrador (RF-M1-01). La cuenta y
 * su rol se guardan en una sola transacción. Toda cuenta nueva queda «Por
 * registrar» (CA-05, decisión del equipo) con una contraseña temporal
 * aleatoria que el Administrador entrega a la persona.
 */
@Injectable()
export class CuentasService {
  constructor(
    private readonly baseDatos: BaseDatosService,
    private readonly usuarios: UsuariosRepository,
    private readonly auditoria: AuditoriaRepository,
  ) {}

  async crear(administrador: UsuarioAutenticado, dto: CrearCuentaDto): Promise<CuentaCreada> {
    // La matriz de permisos completa llega con HU-M1-07; mientras tanto se exige el rol.
    if (!administrador.roles.includes(Rol.ADMINISTRADOR)) {
      throw new ForbiddenException(MENSAJE_SOLO_ADMINISTRADOR);
    }
    // CA-02: rechazar antes de generar nada si el correo ya existe.
    if (await this.usuarios.existeCorreo(this.baseDatos.consultor, dto.correo)) {
      throw new ConflictException(MENSAJE_CORREO_DUPLICADO);
    }

    const contrasenaTemporal = generarContrasenaTemporal();
    const contrasenaHash = await hashContrasena(contrasenaTemporal);

    try {
      return await this.baseDatos.transaccion(async (consultor) => {
        const usuario = await this.usuarios.crear(consultor, {
          nombres: dto.nombres,
          apellidos: dto.apellidos,
          correo: dto.correo,
          contrasenaHash,
          estado: 'POR_REGISTRAR',
          creadoPor: administrador.id,
        });
        await this.usuarios.asignarRol(consultor, usuario.id, dto.rol, administrador.id);
        await this.auditoria.registrar(consultor, {
          modulo: 'M1',
          tabla: 'usuario',
          registroId: usuario.id,
          accion: 'CREAR',
          valorNuevo: { correo: usuario.correo, rol: dto.rol, estado: 'POR_REGISTRAR' },
          usuarioId: administrador.id,
        });
        return {
          id: usuario.id,
          nombre: `${usuario.nombres} ${usuario.apellidos}`,
          correo: usuario.correo,
          rol: dto.rol,
          estado: 'POR_REGISTRAR' as const,
          contrasenaTemporal,
        };
      });
    } catch (error) {
      // El índice único de la base detiene un duplicado que llegue entre la comprobación y el INSERT.
      if (error instanceof CorreoDuplicadoError) throw new ConflictException(MENSAJE_CORREO_DUPLICADO);
      throw error;
    }
  }
}
