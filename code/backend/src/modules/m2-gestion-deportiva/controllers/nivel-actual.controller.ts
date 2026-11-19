import { Controller, Get, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { AutenticacionGuard } from '../../../common/auth/autenticacion.guard.js';
import { RequierePermiso, UsuarioActual } from '../../../common/auth/decoradores.js';
import { PermisosGuard } from '../../../common/auth/permisos.guard.js';
import type { UsuarioAutenticado } from '../../../common/auth/usuario-autenticado.js';
import { PermisoM2 } from '../enums/permiso-m2.enum.js';
import { NivelActualService } from '../services/nivel-actual.service.js';

@Controller('m2/nivel-actual')
@UseGuards(AutenticacionGuard, PermisosGuard)
@RequierePermiso(PermisoM2.NIVEL_CONSULTAR)
export class NivelActualController {
  constructor(private readonly nivelActual: NivelActualService) {}

  @Get('patinadores')
  listarPerfiles(@UsuarioActual() usuario: UsuarioAutenticado) {
    return this.nivelActual.listarPerfiles(usuario);
  }

  @Get('patinadores/:id')
  consultar(@Param('id', ParseIntPipe) id: number, @UsuarioActual() usuario: UsuarioAutenticado) {
    return this.nivelActual.consultar(id, usuario);
  }
}
