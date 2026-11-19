import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AutenticacionTemporalGuard } from '../../../common/auth/autenticacion-temporal.guard.js';
import { RequierePermiso, UsuarioActual } from '../../../common/auth/decoradores.js';
import { PermisosGuard } from '../../../common/auth/permisos.guard.js';
import type { UsuarioAutenticado } from '../../../common/auth/usuario-autenticado.js';
import { CrearProveedorDto, EstadoProveedorDto, FiltrosProveedoresDto } from '../dto/proveedores.dto.js';
import { PermisoM6 } from '../enums/permiso-m6.enum.js';
import { ProveedoresService } from '../services/proveedores.service.js';

@Controller('m6/proveedores')
@UseGuards(AutenticacionTemporalGuard, PermisosGuard)
export class ProveedoresController {
  constructor(private readonly proveedores: ProveedoresService) {}

  @Get()
  @RequierePermiso(PermisoM6.INVENTARIO_GESTIONAR)
  listar(@Query() filtros: FiltrosProveedoresDto) {
    return this.proveedores.listar(filtros);
  }

  @Post()
  @RequierePermiso(PermisoM6.INVENTARIO_GESTIONAR)
  crear(@UsuarioActual() usuario: UsuarioAutenticado, @Body() dto: CrearProveedorDto) {
    return this.proveedores.crear(usuario, dto);
  }

  @Patch(':proveedorId/estado')
  @RequierePermiso(PermisoM6.INVENTARIO_GESTIONAR)
  cambiarEstado(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Param('proveedorId', ParseIntPipe) proveedorId: number,
    @Body() dto: EstadoProveedorDto,
  ) {
    return this.proveedores.cambiarEstado(proveedorId, usuario, dto.activo);
  }
}
