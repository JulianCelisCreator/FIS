import { BadRequestException, ConflictException, ForbiddenException, Injectable } from '@nestjs/common';
import { AuditoriaRepository } from '../../../common/auditoria/auditoria.repository.js';
import { BaseDatosService } from '../../../common/database/base-datos.service.js';
import type { ActivarCuentaDto } from '../dto/activar-cuenta.dto.js';
import { UsuariosRepository } from '../repositories/usuarios.repository.js';
import { hashContrasena } from '../utils/contrasena.js';
import { reglasIncumplidas } from '../utils/politica-contrasena.js';
import { type ContextoIngreso, IngresoService, MENSAJE_CUENTA_DESACTIVADA, type SesionIniciada } from './ingreso.service.js';

export const MENSAJE_YA_ACTIVA = 'Tu cuenta ya está activa. Ingresa con tu contraseña.';
export const MENSAJE_IGUAL_A_TEMPORAL = 'La nueva contraseña debe ser distinta de la temporal.';

/**
 * HU-M1-12 · Activación de la cuenta en el primer ingreso. Decisión del equipo:
 * aplica a todos los roles (toda cuenta nueva nace «Por registrar», HU-M1-01) y
 * la activación exige reemplazar la contraseña temporal.
 *
 * - CA-02: con la contraseña temporal correcta, pide una nueva.
 * - CA-03: al guardarla, la cuenta pasa a «Activa» y queda con la sesión abierta.
 * - CA-04: una cuenta ya activa no se vuelve a activar.
 * - CA-06: la temporal deja de servir porque se reemplaza su hash.
 * El cambio de contraseña y de estado van en la misma sentencia (atómico).
 */
@Injectable()
export class ActivacionService {
  constructor(
    private readonly baseDatos: BaseDatosService,
    private readonly usuarios: UsuariosRepository,
    private readonly ingreso: IngresoService,
    private readonly auditoria: AuditoriaRepository,
  ) {}

  async activar(dto: ActivarCuentaDto, contexto: ContextoIngreso): Promise<SesionIniciada> {
    // Mismas reglas que el ingreso: no revela si el correo existe.
    const usuario = await this.ingreso.verificarCredenciales(dto.correo, dto.contrasenaTemporal);
    if (usuario.estado === 'DESACTIVADA') throw new ForbiddenException(MENSAJE_CUENTA_DESACTIVADA);
    if (usuario.estado === 'ACTIVA') throw new ConflictException(MENSAJE_YA_ACTIVA); // CA-04

    const faltan = reglasIncumplidas(dto.contrasenaNueva);
    if (faltan.length > 0) throw new BadRequestException(faltan);
    if (dto.contrasenaNueva === dto.contrasenaTemporal) throw new BadRequestException(MENSAJE_IGUAL_A_TEMPORAL);

    const nuevoHash = await hashContrasena(dto.contrasenaNueva);
    return this.baseDatos.transaccion(async (cliente) => {
      // Si otra solicitud la activó entre la verificación y aquí, no se repite (CA-04).
      if (!(await this.usuarios.activar(cliente, usuario.id, nuevoHash))) {
        throw new ConflictException(MENSAJE_YA_ACTIVA);
      }
      await this.auditoria.registrar(cliente, {
        modulo: 'M1',
        tabla: 'usuario',
        registroId: usuario.id,
        accion: 'ACTIVAR_CUENTA',
        valorAnterior: { estado: 'POR_REGISTRAR' },
        valorNuevo: { estado: 'ACTIVA' },
        usuarioId: usuario.id,
      });
      return this.ingreso.abrirSesion(cliente, usuario, contexto);
    });
  }
}
