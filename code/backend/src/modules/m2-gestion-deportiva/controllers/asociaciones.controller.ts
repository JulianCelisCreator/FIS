import { Body, Controller, Get, Param, ParseIntPipe, Post, Query, UseGuards } from '@nestjs/common';
import { AutenticacionGuard } from '../../../common/auth/autenticacion.guard.js';
import { RequierePermiso, UsuarioActual } from '../../../common/auth/decoradores.js';
import { PermisosGuard } from '../../../common/auth/permisos.guard.js';
import type { UsuarioAutenticado } from '../../../common/auth/usuario-autenticado.js';
import { PermisoM2 } from '../enums/permiso-m2.enum.js';
import { AsociacionesService } from '../services/asociaciones.service.js';
import { VincularAcudienteDto } from '../dto/vincular-acudiente.dto.js';

@Controller('m2')
@UseGuards(AutenticacionGuard, PermisosGuard)
export class AsociacionesController {
  constructor(private readonly asociaciones: AsociacionesService) {}

  @Get('patinadores')
  @RequierePermiso(PermisoM2.ACUDIENTE_GESTIONAR)
  listarPatinadores(@Query('buscar') buscar?: string) {
    return this.asociaciones.listarPatinadores(buscar);
  }

  @Get('acudientes')
  @RequierePermiso(PermisoM2.ACUDIENTE_GESTIONAR)
  listarAcudientes(@Query('buscar') buscar?: string) {
    return this.asociaciones.listarAcudientes(buscar);
  }

  @Post('patinadores/:patinadorId/acudientes')
  @RequierePermiso(PermisoM2.ACUDIENTE_GESTIONAR)
  vincular(
    @Param('patinadorId', ParseIntPipe) patinadorId: number,
    @Body() dto: VincularAcudienteDto,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ) {
    return this.asociaciones.vincular(patinadorId, dto, usuario);
  }
}
