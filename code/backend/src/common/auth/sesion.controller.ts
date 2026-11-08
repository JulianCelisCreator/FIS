import { Controller, Get, UseGuards } from '@nestjs/common';
import { AutenticacionTemporalGuard } from './autenticacion-temporal.guard.js';
import { UsuarioActual } from './decoradores.js';
import { SesionService } from './sesion.service.js';
import type { UsuarioAutenticado } from './usuario-autenticado.js';

/** TEMPORAL hasta que M1 implemente el inicio de sesión real. */
@Controller('sesion')
export class SesionController {
  constructor(private readonly sesionService: SesionService) {}

  /** Usuario actual, con sus roles y permisos (para mostrar el menú según el rol). */
  @Get()
  @UseGuards(AutenticacionTemporalGuard)
  actual(@UsuarioActual() usuario: UsuarioAutenticado) {
    return this.sesionService.actual(usuario);
  }

  /** Usuarios activos para elegir con quién probar. Solo en desarrollo. */
  @Get('usuarios')
  usuariosDePrueba() {
    return this.sesionService.usuariosDePrueba();
  }
}
