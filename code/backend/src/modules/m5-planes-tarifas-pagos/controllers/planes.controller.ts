import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AutenticacionGuard } from '../../../common/auth/autenticacion.guard.js';
import { RequierePermiso, UsuarioActual } from '../../../common/auth/decoradores.js';
import { PermisosGuard } from '../../../common/auth/permisos.guard.js';
import type { UsuarioAutenticado } from '../../../common/auth/usuario-autenticado.js';
import {
  CrearPlanDto,
  DesactivarPlanDto,
  EditarPlanDto,
  FiltrosPlanesDto,
  RegistrarTarifaDto,
} from '../dto/planes.dto.js';
import { PermisoM5 } from '../enums/permiso-m5.enum.js';
import { PlanesService } from '../services/planes.service.js';

@Controller('m5/planes')
@UseGuards(AutenticacionGuard, PermisosGuard)
export class PlanesController {
  constructor(private readonly planesService: PlanesService) {}

  /** RF-M5-05: oferta de planes activos con su tarifa vigente (todos los roles con acceso a M5). */
  @Get('oferta')
  @RequierePermiso(PermisoM5.PLAN_CONSULTAR)
  oferta() {
    return this.planesService.oferta();
  }

  /** RF-M5-05 (Administrador): todos los planes, filtrables por tipo, estado y nombre. */
  @Get()
  @RequierePermiso(PermisoM5.PLAN_GESTIONAR)
  listar(@Query() filtros: FiltrosPlanesDto) {
    return this.planesService.listar(filtros);
  }

  /** Detalle de un plan con su historial de tarifas. */
  @Get(':planId')
  @RequierePermiso(PermisoM5.PLAN_GESTIONAR)
  detalle(@Param('planId', ParseIntPipe) planId: number) {
    return this.planesService.detalle(planId);
  }

  /** RF-M5-01: crear plan. */
  @Post()
  @RequierePermiso(PermisoM5.PLAN_GESTIONAR)
  crear(@UsuarioActual() usuario: UsuarioAutenticado, @Body() dto: CrearPlanDto) {
    return this.planesService.crear(usuario, dto);
  }

  /** RF-M5-02: editar nombre, día límite o descripción. */
  @Patch(':planId')
  @RequierePermiso(PermisoM5.PLAN_GESTIONAR)
  editar(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Param('planId', ParseIntPipe) planId: number,
    @Body() dto: EditarPlanDto,
  ) {
    return this.planesService.editar(usuario, planId, dto);
  }

  /** RF-M5-03: desactivar (no existe eliminar). */
  @Post(':planId/desactivar')
  @HttpCode(HttpStatus.OK)
  @RequierePermiso(PermisoM5.PLAN_GESTIONAR)
  desactivar(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Param('planId', ParseIntPipe) planId: number,
    @Body() dto: DesactivarPlanDto,
  ) {
    return this.planesService.desactivar(usuario, planId, dto);
  }

  /** RF-M5-04: registrar una tarifa con fecha de vigencia. */
  @Post(':planId/tarifas')
  @RequierePermiso(PermisoM5.PLAN_GESTIONAR)
  registrarTarifa(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Param('planId', ParseIntPipe) planId: number,
    @Body() dto: RegistrarTarifaDto,
  ) {
    return this.planesService.registrarTarifa(usuario, planId, dto);
  }
}
