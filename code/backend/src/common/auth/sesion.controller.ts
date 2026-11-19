import { Controller, Get, UseGuards } from '@nestjs/common';
import { AutenticacionGuard } from './autenticacion.guard.js';
import { UsuarioActual } from './decoradores.js';
import { SesionService } from './sesion.service.js';
import type { UsuarioAutenticado } from './usuario-autenticado.js';

@Controller('sesion')
export class SesionController {
  constructor(private readonly sesionService: SesionService) {}

  /** Usuario de la sesión actual, con su rol y permisos (para mostrar el menú según el rol). */
  @Get()
  @UseGuards(AutenticacionGuard)
  actual(@UsuarioActual() usuario: UsuarioAutenticado) {
    return this.sesionService.actual(usuario);
  }
}
