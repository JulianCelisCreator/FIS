import { BadRequestException, Injectable } from '@nestjs/common';
import { hoyEnClub } from '../../../common/utils/fecha-club.js';
import { PanelRepository } from '../repositories/panel.repository.js';
import { ReportesRepository } from '../repositories/reportes.repository.js';
import { rangoPanel, type PanelAdministrativo } from '../utils/reglas-panel.js';
import { ErrorReglaReporte, reporteIngresos } from '../utils/reglas-reporte.js';

/** Panel general administrativo (HU-6.1), solo para el Administrador. */
@Injectable()
export class PanelService {
  constructor(
    private readonly panel: PanelRepository,
    private readonly reportes: ReportesRepository,
  ) {}

  async consultar(desdeSolicitado?: string, hastaSolicitado?: string): Promise<PanelAdministrativo> {
    let rango;
    try {
      rango = rangoPanel(hoyEnClub(), desdeSolicitado, hastaSolicitado);
    } catch (error) {
      if (error instanceof ErrorReglaReporte) throw new BadRequestException(error.message);
      throw error;
    }
    const { desde, hasta } = rango;
    const generadoEn = new Date().toISOString();
    const [conteos, conceptos, reembolsos] = await Promise.all([
      this.panel.conteos(),
      this.reportes.ingresosPorConcepto(desde, hasta),
      this.reportes.reembolsos(desde, hasta),
    ]);
    // Mismo cálculo que el reporte de ingresos, para que ambos coincidan.
    const ingresos = reporteIngresos({ desde, hasta, generadoEn }, conceptos, reembolsos);
    const ingresosPeriodo = ingresos.totales.find((total) => total.clave === 'ingresosNetos')?.valor ?? 0;
    return { desde, hasta, generadoEn, ...conteos, ingresosPeriodo };
  }
}
