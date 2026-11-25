import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { AutenticacionGuard } from '../../../common/auth/autenticacion.guard.js';
import { RequierePermiso, UsuarioActual } from '../../../common/auth/decoradores.js';
import { PermisosGuard } from '../../../common/auth/permisos.guard.js';
import type { UsuarioAutenticado } from '../../../common/auth/usuario-autenticado.js';
import { CrearCategoriaDto, EditarCategoriaDto } from '../dto/categorias.dto.js';
import { PermisoM2Seguimiento } from '../enums/permiso-m2-seguimiento.enum.js';
import { CategoriasService } from '../services/categorias.service.js';

/** RF-M2-07 (gestión), RF-M2-17 (catálogo para el profesor) y RF-M2-19 (categorías para el acudiente). */
@Controller('m2')
@UseGuards(AutenticacionGuard, PermisosGuard)
export class CategoriasController {
  constructor(private readonly categorias: CategoriasService) {}

  @Get('categorias')
  @RequierePermiso(PermisoM2Seguimiento.CATEGORIA_CONSULTAR)
  listar(@UsuarioActual() usuario: UsuarioAutenticado) {
    return this.categorias.listar(usuario);
  }

  @Get('catalogo-club')
  @RequierePermiso(PermisoM2Seguimiento.CATEGORIA_CONSULTAR)
  catalogo(@UsuarioActual() usuario: UsuarioAutenticado) {
    return this.categorias.catalogo(usuario);
  }

  @Post('categorias')
  @RequierePermiso(PermisoM2Seguimiento.CATEGORIA_GESTIONAR)
  crear(@Body() dto: CrearCategoriaDto, @UsuarioActual() usuario: UsuarioAutenticado) {
    return this.categorias.crear(dto, usuario);
  }

  @Patch('categorias/:id')
  @RequierePermiso(PermisoM2Seguimiento.CATEGORIA_GESTIONAR)
  actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: EditarCategoriaDto,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ) {
    return this.categorias.actualizar(id, dto, usuario);
  }
}
