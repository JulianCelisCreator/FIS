import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ReportesRepository } from '../repositories/reportes.repository.js';
import {
  ErrorReglaReporte,
  reporteCartera,
  reporteIngresos,
  reporteMovimientos,
  reportePagos,
  validarRango,
  validarTipoReporte,
  type Reporte,
} from '../utils/reglas-reporte.js';

function aHttp(error: unknown): unknown {
  if (error instanceof ErrorReglaReporte) {
    return error.motivo === 'NO_ENCONTRADO'
      ? new NotFoundException(error.message)
      : new BadRequestException(error.message);
  }
  return error;
}

/** Reportes financieros de solo lectura (HU-6.4) para Administrador y Contador. */
@Injectable()
export class ReportesService {
  constructor(private readonly reportes: ReportesRepository) {}

  async generar(tipoSolicitado: string, desdeSolicitado?: string, hastaSolicitado?: string): Promise<Reporte> {
    let tipo;
    let rango;
    try {
      tipo = validarTipoReporte(tipoSolicitado);
      rango = validarRango(desdeSolicitado, hastaSolicitado);
    } catch (error) {
      throw aHttp(error);
    }
    const { desde, hasta } = rango;
    const encabezado = { desde, hasta, generadoEn: new Date().toISOString() };

    switch (tipo) {
      case 'ingresos': {
        const [conceptos, reembolsos] = await Promise.all([
          this.reportes.ingresosPorConcepto(desde, hasta),
          this.reportes.reembolsos(desde, hasta),
        ]);
        return reporteIngresos(encabezado, conceptos, reembolsos);
      }
      case 'pagos':
        return reportePagos(encabezado, await this.reportes.pagosRecibidos(desde, hasta));
      case 'cartera':
        return reporteCartera(encabezado, await this.reportes.carteraAFecha(hasta));
      case 'movimientos-uniformes': {
        const [movimientos, ventas] = await Promise.all([
          this.reportes.movimientosUniformes(desde, hasta),
          this.reportes.valoresVentas(desde, hasta),
        ]);
        return reporteMovimientos(encabezado, movimientos, ventas);
      }
    }
  }
}
