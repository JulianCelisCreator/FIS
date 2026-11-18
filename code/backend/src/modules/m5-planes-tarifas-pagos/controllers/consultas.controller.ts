import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
  Res,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { AutenticacionGuard } from '../../../common/auth/autenticacion.guard.js';
import { RequierePermiso, UsuarioActual } from '../../../common/auth/decoradores.js';
import { PermisosGuard } from '../../../common/auth/permisos.guard.js';
import type { UsuarioAutenticado } from '../../../common/auth/usuario-autenticado.js';
import {
  ExportarHistorialDto,
  FiltrosCarteraDto,
  FiltrosHistorialDto,
} from '../dto/consultas.dto.js';
import { PermisoM5 } from '../enums/permiso-m5.enum.js';
import { CarteraService } from '../services/cartera.service.js';
import { ConsultasPagosService, type Archivo } from '../services/consultas-pagos.service.js';

function enviarArchivo(respuesta: Response, archivo: Archivo, disposicion: 'inline' | 'attachment') {
  respuesta.set({
    'Content-Type': archivo.tipo,
    'Content-Disposition': `${disposicion}; filename="${archivo.nombre}"`,
    'Cache-Control': 'no-store',
  });
  return new StreamableFile(archivo.contenido);
}

/** Consultas de M5: cartera, historial, comprobantes y estado de cuenta. */
@Controller('m5')
@UseGuards(AutenticacionGuard, PermisosGuard)
export class ConsultasController {
  constructor(
    private readonly carteraService: CarteraService,
    private readonly consultasService: ConsultasPagosService,
  ) {}

  /** RF-M5-13: cartera de los patinadores con filtros combinables (Administrador y Contador). */
  @Get('cartera')
  @RequierePermiso(PermisoM5.CARTERA_CONSULTAR)
  cartera(@Query() filtros: FiltrosCarteraDto) {
    return this.carteraService.consultar(filtros);
  }

  /** RF-M5-16: historial de pagos con filtros (Administrador y Contador). */
  @Get('pagos')
  @RequierePermiso(PermisoM5.PAGO_HISTORIAL)
  historial(@Query() filtros: FiltrosHistorialDto) {
    return this.consultasService.historial(filtros);
  }

  /** RF-M5-16: el historial filtrado en PDF o XLSX. */
  @Get('pagos/exportar')
  @RequierePermiso(PermisoM5.PAGO_HISTORIAL)
  async exportar(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Query() dto: ExportarHistorialDto,
    @Res({ passthrough: true }) respuesta: Response,
  ) {
    return enviarArchivo(respuesta, await this.consultasService.exportarHistorial(usuario, dto), 'attachment');
  }

  /** RF-M5-15: comprobante en PDF; el acudiente y el patinador solo los de sus propios pagos. */
  @Get('pagos/:pagoId/comprobante.pdf')
  @RequierePermiso(PermisoM5.COMPROBANTE_DESCARGAR)
  async comprobante(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Param('pagoId', ParseIntPipe) pagoId: number,
    @Res({ passthrough: true }) respuesta: Response,
  ) {
    return enviarArchivo(respuesta, await this.consultasService.comprobante(usuario, pagoId), 'inline');
  }

  /** RF-M5-17/18: estado de cuenta de un patinador (cartera, plan, cobros y pagos). */
  @Get('patinadores/:patinadorId/estado-cuenta')
  estadoCuenta(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Param('patinadorId', ParseIntPipe) patinadorId: number,
  ) {
    return this.consultasService.estadoCuenta(usuario, patinadorId);
  }
}
