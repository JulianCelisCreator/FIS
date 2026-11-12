import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AutenticacionGuard } from '../../../common/auth/autenticacion.guard.js';
import { RequierePermiso, UsuarioActual } from '../../../common/auth/decoradores.js';
import { PermisosGuard } from '../../../common/auth/permisos.guard.js';
import type { UsuarioAutenticado } from '../../../common/auth/usuario-autenticado.js';
import { GenerarCobrosDto } from '../dto/generar-cobros.dto.js';
import { PermisoM5 } from '../enums/permiso-m5.enum.js';
import { CobrosService } from '../services/cobros.service.js';

@Controller('m5')
@UseGuards(AutenticacionGuard, PermisosGuard)
export class CobrosController {
  constructor(private readonly cobrosService: CobrosService) {}

  /**
   * RF-M5-08: genera las mensualidades de un mes. El proceso automático ya lo
   * hace cada día 1; esto permite al Administrador lanzarlo o recuperar un mes.
   */
  @Post('cobros/generacion')
  @HttpCode(HttpStatus.OK)
  @RequierePermiso(PermisoM5.COBRO_GENERAR)
  generar(@Body() dto: GenerarCobrosDto) {
    return this.cobrosService.generarMensualidades(dto.periodo);
  }

  /** Cobros con saldo de un patinador (lista «Cobro a pagar»). */
  @Get('patinadores/:patinadorId/cobros-pendientes')
  pendientes(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Param('patinadorId', ParseIntPipe) patinadorId: number,
  ) {
    return this.cobrosService.pendientes(usuario, patinadorId);
  }
}
