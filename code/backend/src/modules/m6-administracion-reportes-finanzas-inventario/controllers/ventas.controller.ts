import { Body, Controller, Get, Param, ParseIntPipe, Post, Query, UseGuards } from '@nestjs/common';
import { AutenticacionTemporalGuard } from '../../../common/auth/autenticacion-temporal.guard.js';
import { RequierePermiso, UsuarioActual } from '../../../common/auth/decoradores.js';
import { PermisosGuard } from '../../../common/auth/permisos.guard.js';
import type { UsuarioAutenticado } from '../../../common/auth/usuario-autenticado.js';
import { FiltrosVentasDto, RegistrarVentaDto } from '../dto/ventas.dto.js';
import { PermisoM6 } from '../enums/permiso-m6.enum.js';
import { VentasService } from '../services/ventas.service.js';

/**
 * Venta de uniformes (HU-6.7). Solo el Administrador (M6_INVENTARIO_GESTIONAR).
 * No hay PATCH ni DELETE: una venta confirmada es inmutable.
 */
@Controller('m6/ventas')
@UseGuards(AutenticacionTemporalGuard, PermisosGuard)
@RequierePermiso(PermisoM6.INVENTARIO_GESTIONAR)
export class VentasController {
  constructor(private readonly ventas: VentasService) {}

  @Get()
  listar(@Query() filtros: FiltrosVentasDto) {
    return this.ventas.listar(filtros.buscar);
  }

  @Get('compradores')
  listarCompradores() {
    return this.ventas.listarCompradores();
  }

  @Get(':ventaId')
  detalle(@Param('ventaId', ParseIntPipe) ventaId: number) {
    return this.ventas.detalle(ventaId);
  }

  @Post()
  registrar(@UsuarioActual() usuario: UsuarioAutenticado, @Body() dto: RegistrarVentaDto) {
    return this.ventas.registrar(usuario, dto);
  }
}
