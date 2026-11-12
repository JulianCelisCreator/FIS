
import {
  Body,
  Controller,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { AutenticacionTemporalGuard } from '../../../common/auth/autenticacion-temporal.guard.js';
import { RequierePermiso, UsuarioActual } from '../../../common/auth/decoradores.js';
import { PermisosGuard } from '../../../common/auth/permisos.guard.js';
import type { UsuarioAutenticado } from '../../../common/auth/usuario-autenticado.js';
import {
  RegistrarMatriculaDto,
  RegistrarPagoCobroDto,
  RegistrarPagoSesionDto,
} from '../dto/registrar-pagos.dto.js';
import { PermisoM5 } from '../enums/permiso-m5.enum.js';
import { PagosService } from '../services/pagos.service.js';

class AnularPagoDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  motivo!: string;
}

/** Registro y anulación de pagos. */
@Controller('m5/pagos')
@UseGuards(AutenticacionTemporalGuard, PermisosGuard)
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

  /** Matrícula y gastos administrativos. */
  @Post('matricula')
  @RequierePermiso(PermisoM5.PAGO_REGISTRAR)
  registrarMatricula(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Body() dto: RegistrarMatriculaDto,
  ) {
    return this.pagosService.registrarMatricula(usuario, dto);
  }

  /** RF-M5-11: anulación de pago exclusiva para Administrador. */
  @Patch(':id/anular')
  @RequierePermiso(PermisoM5.PAGO_ANULAR)
  anularPago(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AnularPagoDto,
  ) {
    return this.pagosService.anularPago(usuario, id, dto.motivo);
  }
}
