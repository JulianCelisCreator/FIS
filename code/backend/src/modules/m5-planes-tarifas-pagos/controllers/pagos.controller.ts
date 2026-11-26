import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { AutenticacionGuard } from '../../../common/auth/autenticacion.guard.js';
import { RequierePermiso, UsuarioActual } from '../../../common/auth/decoradores.js';
import { PermisosGuard } from '../../../common/auth/permisos.guard.js';
import type { UsuarioAutenticado } from '../../../common/auth/usuario-autenticado.js';
import { AnularPagoDto } from '../dto/anular-pago.dto.js';
import {
  RegistrarMatriculaDto,
  RegistrarPagoCobroDto,
  RegistrarPagoSesionDto,
  RegistrarValoracionDto,
} from '../dto/registrar-pagos.dto.js';
import { PermisoM5 } from '../enums/permiso-m5.enum.js';
import { PagosService } from '../services/pagos.service.js';

/** Registro manual de pagos (Administrador y Contador, M6-03) y anulación (solo Administrador). */
@Controller('m5/pagos')
@UseGuards(AutenticacionGuard, PermisosGuard)
export class PagosController {
  constructor(private readonly pagosService: PagosService) {}

  /** RF-M5-09: pago total o parcial de un cobro. */
  @Post('cobro')
  @RequierePermiso(PermisoM5.PAGO_REGISTRAR)
  registrarPagoCobro(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Body() dto: RegistrarPagoCobroDto,
  ) {
    return this.pagosService.registrarPagoCobro(usuario, dto);
  }

  /** RF-M5-10: pago por sesión (plan de día único). */
  @Post('sesion')
  @RequierePermiso(PermisoM5.PAGO_REGISTRAR)
  registrarPagoSesion(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Body() dto: RegistrarPagoSesionDto,
  ) {
    return this.pagosService.registrarPagoSesion(usuario, dto);
  }

  /** Matrícula y gastos administrativos, previos a activar el primer plan. */
  @Post('matricula')
  @RequierePermiso(PermisoM5.PAGO_REGISTRAR)
  registrarMatricula(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Body() dto: RegistrarMatriculaDto,
  ) {
    return this.pagosService.registrarMatricula(usuario, dto);
  }

  /** Valor de la valoración y porcentajes de recargo vigentes (para los totales de la pantalla). */
  @Get('parametros')
  @RequierePermiso(PermisoM5.PAGO_REGISTRAR)
  parametros() {
    return this.pagosService.parametros();
  }

  /** Clase de valoración previa a la inscripción; se abona a la matrícula. */
  @Post('valoracion')
  @RequierePermiso(PermisoM5.PAGO_REGISTRAR)
  registrarValoracion(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Body() dto: RegistrarValoracionDto,
  ) {
    return this.pagosService.registrarValoracion(usuario, dto);
  }

  /** RF-M5-11: anulación con motivo obligatorio; solo el Administrador tiene el permiso. */
  @Patch(':pagoId/anular')
  @RequierePermiso(PermisoM5.PAGO_ANULAR)
  anularPago(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Param('pagoId', ParseIntPipe) pagoId: number,
    @Body() dto: AnularPagoDto,
  ) {
    return this.pagosService.anularPago(usuario, pagoId, dto.motivo);
  }
}
