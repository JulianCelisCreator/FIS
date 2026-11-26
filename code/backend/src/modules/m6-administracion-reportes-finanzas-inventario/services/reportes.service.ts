import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ReportesRepository } from '../repositories/reportes.repository.js';
import {
  FORMATOS_EXPORTACION,
  TIPO_CONTENIDO,
  generarPdf,
  generarXlsx,
  nombreArchivo,
  type FormatoExportacion,
} from '../utils/exportar-reporte.js';
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
export interface ArchivoReporte {
  contenido: Buffer;
  nombre: string;
  tipoContenido: string;
}

@Injectable()
export class ReportesService {
  private readonly logger = new Logger(ReportesService.name);

  constructor(private readonly reportes: ReportesRepository) {}

  /**
   * HU-6.5: genera el reporte igual que en pantalla y lo convierte a PDF o
   * XLSX en el servidor. Si la generación falla, el usuario ve un error claro.
   */
  async exportar(
    tipo: string,
    formatoSolicitado: string | undefined,
    desde?: string,
    hasta?: string,
  ): Promise<ArchivoReporte> {
    if (!formatoSolicitado || !(FORMATOS_EXPORTACION as readonly string[]).includes(formatoSolicitado)) {
      throw new BadRequestException('Elige el formato del archivo: pdf o xlsx');
    }
    const formato = formatoSolicitado as FormatoExportacion;
    const reporte = await this.generar(tipo, desde, hasta);
    try {
      const contenido = formato === 'pdf' ? await generarPdf(reporte) : await generarXlsx(reporte);
      return { contenido, nombre: nombreArchivo(reporte, formato), tipoContenido: TIPO_CONTENIDO[formato] };
    } catch (error) {
      this.logger.error(`No se pudo generar el ${formato} del reporte ${reporte.tipo}`, error as Error);
      throw new InternalServerErrorException('No se pudo generar el archivo del reporte. Intenta de nuevo.');
    }
  }

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
