import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { AutenticacionGuard } from '../../../common/auth/autenticacion.guard.js';
import { RequierePermiso, UsuarioActual } from '../../../common/auth/decoradores.js';
import { PermisosGuard } from '../../../common/auth/permisos.guard.js';
import type { UsuarioAutenticado } from '../../../common/auth/usuario-autenticado.js';
import { CrearPatinadorDto, EditarPatinadorDto } from '../dto/patinador.dto.js';
import { PermisoM2 } from '../enums/permiso-m2.enum.js';
import { PerfilesPatinadorService } from '../services/perfiles-patinador.service.js';

@Controller('m2/perfiles-patinador')
@UseGuards(AutenticacionGuard, PermisosGuard)
@RequierePermiso(PermisoM2.PATINADOR_GESTIONAR)
export class PerfilesPatinadorController {
  constructor(private readonly perfiles: PerfilesPatinadorService) {}

  @Get()
  listar() { return this.perfiles.listar(); }

  @Post()
  crear(@Body() dto: CrearPatinadorDto, @UsuarioActual() usuario: UsuarioAutenticado) {
    return this.perfiles.crear(dto, usuario);
  }

  @Patch(':id')
  actualizar(@Param('id', ParseIntPipe) id: number, @Body() dto: EditarPatinadorDto, @UsuarioActual() usuario: UsuarioAutenticado) {
    return this.perfiles.actualizar(id, dto, usuario);
  }
}
