import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AutenticacionGuard } from '../../../common/auth/autenticacion.guard.js';
import { RequierePermiso } from '../../../common/auth/decoradores.js';
import { PermisosGuard } from '../../../common/auth/permisos.guard.js';
import { RangoReporteDto } from '../dto/reportes.dto.js';
import { PermisoM6 } from '../enums/permiso-m6.enum.js';
import { ReportesService } from '../services/reportes.service.js';

/**
 * Reportes financieros (HU-6.4 / RF-M6-04). Solo lectura: el Administrador y el
 * Contador (permiso M6_REPORTE_FINANCIERO) consultan; nadie modifica datos aquí.
 */
@Controller('m6/reportes')
@UseGuards(AutenticacionGuard, PermisosGuard)
export class ReportesController {
  constructor(private readonly reportes: ReportesService) {}

  @Get(':tipo')
  @RequierePermiso(PermisoM6.REPORTE_FINANCIERO)
  generar(@Param('tipo') tipo: string, @Query() rango: RangoReporteDto) {
    return this.reportes.generar(tipo, rango.desde, rango.hasta);
  }
}
