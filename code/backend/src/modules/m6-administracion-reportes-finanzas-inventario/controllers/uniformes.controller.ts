import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AutenticacionTemporalGuard } from '../../../common/auth/autenticacion-temporal.guard.js';
import { RequierePermiso, UsuarioActual } from '../../../common/auth/decoradores.js';
import { PermisosGuard } from '../../../common/auth/permisos.guard.js';
import type { UsuarioAutenticado } from '../../../common/auth/usuario-autenticado.js';
import {
  AjustarStockDto,
  CrearUniformeDto,
  DesactivarUniformeDto,
  EditarUniformeDto,
  FiltrosUniformesDto,
} from '../dto/uniformes.dto.js';
import { PermisoM6 } from '../enums/permiso-m6.enum.js';
import { UniformesService } from '../services/uniformes.service.js';

@Controller('m6/uniformes')
@UseGuards(AutenticacionTemporalGuard, PermisosGuard)
export class UniformesController {
  constructor(private readonly uniformes: UniformesService) {}

  @Get()
  @RequierePermiso(PermisoM6.INVENTARIO_GESTIONAR)
  listar(@Query() filtros: FiltrosUniformesDto) {
    return this.uniformes.listar(filtros);
  }

  @Get(':uniformeId')
  @RequierePermiso(PermisoM6.INVENTARIO_GESTIONAR)
  detalle(@Param('uniformeId', ParseIntPipe) uniformeId: number) {
    return this.uniformes.detalle(uniformeId);
  }

  @Post()
  @RequierePermiso(PermisoM6.INVENTARIO_GESTIONAR)
  crear(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Body() dto: CrearUniformeDto,
  ) {
    return this.uniformes.crear(usuario, dto);
  }

  @Patch(':uniformeId/stock')
  @RequierePermiso(PermisoM6.INVENTARIO_GESTIONAR)
  ajustar(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Param('uniformeId', ParseIntPipe) uniformeId: number,
    @Body() dto: AjustarStockDto,
  ) {
    return this.uniformes.ajustar(uniformeId, usuario, dto);
  }

  @Patch(':uniformeId')
  @RequierePermiso(PermisoM6.INVENTARIO_GESTIONAR)
  editar(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Param('uniformeId', ParseIntPipe) uniformeId: number,
    @Body() dto: EditarUniformeDto,
  ) {
    return this.uniformes.editar(uniformeId, usuario, dto);
  }

  @Post(':uniformeId/reactivar')
  @RequierePermiso(PermisoM6.INVENTARIO_GESTIONAR)
  reactivar(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Param('uniformeId', ParseIntPipe) uniformeId: number,
  ) {
    return this.uniformes.reactivar(uniformeId, usuario);
  }

  @Post(':uniformeId/desactivar')
  @RequierePermiso(PermisoM6.INVENTARIO_GESTIONAR)
  desactivar(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Param('uniformeId', ParseIntPipe) uniformeId: number,
    @Body() dto: DesactivarUniformeDto,
  ) {
    return this.uniformes.desactivar(uniformeId, usuario, dto.motivo);
  }
}
