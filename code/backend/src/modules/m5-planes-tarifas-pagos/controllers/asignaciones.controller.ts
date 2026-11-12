import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AutenticacionGuard } from '../../../common/auth/autenticacion.guard.js';
import { RequierePermiso, UsuarioActual } from '../../../common/auth/decoradores.js';
import { PermisosGuard } from '../../../common/auth/permisos.guard.js';
import type { UsuarioAutenticado } from '../../../common/auth/usuario-autenticado.js';
import { AsignarPlanDto } from '../dto/asignar-plan.dto.js';
import { CambiarPlanDto } from '../dto/cambiar-plan.dto.js';
import { PermisoM5 } from '../enums/permiso-m5.enum.js';
import { AsignacionesService } from '../services/asignaciones.service.js';

@Controller('m5')
@UseGuards(AutenticacionGuard, PermisosGuard)
export class AsignacionesController {
  constructor(private readonly asignacionesService: AsignacionesService) {}

  /** RF-M5-06: asignar plan a un patinador sin plan activo. */
  @Post('asignaciones')
  @RequierePermiso(PermisoM5.PLAN_ASIGNAR)
  asignar(@UsuarioActual() usuario: UsuarioAutenticado, @Body() dto: AsignarPlanDto) {
    return this.asignacionesService.asignar(usuario, dto);
  }

  /** RF-M5-07: cambiar el plan desde el siguiente periodo de facturación. */
  @Post('asignaciones/cambios')
  @RequierePermiso(PermisoM5.PLAN_ASIGNAR)
  cambiar(@UsuarioActual() usuario: UsuarioAutenticado, @Body() dto: CambiarPlanDto) {
    return this.asignacionesService.cambiar(usuario, dto);
  }

  /** Plan actual, cambio programado e historial de planes del patinador. */
  @Get('patinadores/:patinadorId/plan')
  consultarPlan(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Param('patinadorId', ParseIntPipe) patinadorId: number,
  ) {
    return this.asignacionesService.consultarPlan(usuario, patinadorId);
  }
}
