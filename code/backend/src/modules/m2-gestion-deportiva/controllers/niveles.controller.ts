import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { AutenticacionGuard } from '../../../common/auth/autenticacion.guard.js';
import { RequierePermiso, UsuarioActual } from '../../../common/auth/decoradores.js';
import { PermisosGuard } from '../../../common/auth/permisos.guard.js';
import type { UsuarioAutenticado } from '../../../common/auth/usuario-autenticado.js';
import { CrearNivelDto, EditarNivelDto } from '../dto/niveles.dto.js';
import { PermisoM2 } from '../enums/permiso-m2.enum.js';
import { NivelesService } from '../services/niveles.service.js';

@Controller('m2/niveles')
@UseGuards(AutenticacionGuard, PermisosGuard)
export class NivelesController {
  constructor(private readonly niveles: NivelesService) {}

  @Get()
  @RequierePermiso(PermisoM2.NIVEL_GESTIONAR)
  listar() {
    return this.niveles.listar();
  }

  @Post()
  @RequierePermiso(PermisoM2.NIVEL_GESTIONAR)
  crear(@Body() dto: CrearNivelDto, @UsuarioActual() usuario: UsuarioAutenticado) {
    return this.niveles.crear(dto, usuario);
  }

  @Patch(':id')
  @RequierePermiso(PermisoM2.NIVEL_GESTIONAR)
  actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: EditarNivelDto,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ) {
    return this.niveles.actualizar(id, dto, usuario);
  }
}
