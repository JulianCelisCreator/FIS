import { Controller, Get, Param, Query, StreamableFile, UseGuards } from '@nestjs/common';
import { AutenticacionGuard } from '../../../common/auth/autenticacion.guard.js';
import { RequierePermiso } from '../../../common/auth/decoradores.js';
import { PermisosGuard } from '../../../common/auth/permisos.guard.js';
import { ExportarReporteDto, RangoReporteDto } from '../dto/reportes.dto.js';
import { PermisoM6 } from '../enums/permiso-m6.enum.js';
import { ReportesService } from '../services/reportes.service.js';

/**
 * Reportes financieros (HU-6.4 / RF-M6-04) y su exportación (HU-6.5 / RF-M6-05).
 * Solo lectura: el Administrador y el Contador (permiso M6_REPORTE_FINANCIERO)
 * consultan y exportan; nadie modifica datos aquí.
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

  /** GET /m6/reportes/:tipo/exportar?formato=pdf|xlsx&desde&hasta → descarga del archivo. */
  @Get(':tipo/exportar')
  @RequierePermiso(PermisoM6.REPORTE_FINANCIERO)
  async exportar(@Param('tipo') tipo: string, @Query() consulta: ExportarReporteDto): Promise<StreamableFile> {
    const archivo = await this.reportes.exportar(tipo, consulta.formato, consulta.desde, consulta.hasta);
    return new StreamableFile(archivo.contenido, {
      type: archivo.tipoContenido,
      disposition: `attachment; filename="${archivo.nombre}"`,
      length: archivo.contenido.length,
    });
  }
}
