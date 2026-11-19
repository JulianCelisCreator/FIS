import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AutenticacionGuard } from '../../../common/auth/autenticacion.guard.js';
import { RequierePermiso } from '../../../common/auth/decoradores.js';
import { PermisosGuard } from '../../../common/auth/permisos.guard.js';
import { RangoReporteDto } from '../dto/reportes.dto.js';
import { PermisoM6 } from '../enums/permiso-m6.enum.js';
import { PanelService } from '../services/panel.service.js';

/**
 * Panel general administrativo (HU-6.1 / RF-M6-01). Solo el Administrador
 * (permiso M6_PANEL_CONSULTAR); cualquier otro rol recibe 403.
 */
@Controller('m6/panel')
@UseGuards(AutenticacionGuard, PermisosGuard)
export class PanelController {
  constructor(private readonly panel: PanelService) {}

  /** GET /m6/panel?desde&hasta: sin fechas, ingresos del mes en curso. */
  @Get()
  @RequierePermiso(PermisoM6.PANEL_CONSULTAR)
  consultar(@Query() rango: RangoReporteDto) {
    return this.panel.consultar(rango.desde, rango.hasta);
  }
}
