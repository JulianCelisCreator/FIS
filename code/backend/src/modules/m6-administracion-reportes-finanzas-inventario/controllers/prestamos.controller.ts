import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { AutenticacionTemporalGuard } from '../../../common/auth/autenticacion-temporal.guard.js';
import { RequierePermiso, UsuarioActual } from '../../../common/auth/decoradores.js';
import { PermisosGuard } from '../../../common/auth/permisos.guard.js';
import type { UsuarioAutenticado } from '../../../common/auth/usuario-autenticado.js';
import { CrearPrestamoDto, RecibirPrestamoDto } from '../dto/prestamos.dto.js';
import { PermisoM6 } from '../enums/permiso-m6.enum.js';
import { PrestamosService } from '../services/prestamos.service.js';

@Controller('m6/prestamos')
@UseGuards(AutenticacionTemporalGuard, PermisosGuard)
export class PrestamosController {
  constructor(private readonly prestamos: PrestamosService) {}

  @Get()
  @RequierePermiso(PermisoM6.INVENTARIO_GESTIONAR)
  listar() {
    return this.prestamos.listar();
  }

  @Get('patinadores')
  @RequierePermiso(PermisoM6.INVENTARIO_GESTIONAR)
  listarPatinadores() {
    return this.prestamos.listarPatinadores();
  }

  @Post()
  @RequierePermiso(PermisoM6.INVENTARIO_GESTIONAR)
  crear(@UsuarioActual() usuario: UsuarioAutenticado, @Body() dto: CrearPrestamoDto) {
    return this.prestamos.crear(usuario, dto);
  }

  @Patch(':prestamoId/recibir')
  @RequierePermiso(PermisoM6.INVENTARIO_GESTIONAR)
  recibir(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Param('prestamoId', ParseIntPipe) prestamoId: number,
    @Body() dto: RecibirPrestamoDto,
  ) {
    return this.prestamos.recibir(prestamoId, usuario, dto);
  }
}
