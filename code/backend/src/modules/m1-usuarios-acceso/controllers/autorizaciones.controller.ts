import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AutenticacionGuard } from '../../../common/auth/autenticacion.guard.js';
import { UsuarioActual } from '../../../common/auth/decoradores.js';
import type { UsuarioAutenticado } from '../../../common/auth/usuario-autenticado.js';
import { RegistrarAutorizacionDto } from '../dto/registrar-autorizacion.dto.js';
import { AutorizacionesService } from '../services/autorizaciones.service.js';

@Controller('m1/autorizaciones')
@UseGuards(AutenticacionGuard)
export class AutorizacionesController {
  constructor(private readonly autorizacionesService: AutorizacionesService) {}

  /** Patinadores visibles: los del acudiente o todos los del Administrador. */
  @Get()
  listar(@UsuarioActual() usuario: UsuarioAutenticado) {
    return this.autorizacionesService.listar(usuario);
  }

  /** CA-03 y CA-04: estado de la autorización y qué acudiente la otorgó. */
  @Get(':patinadorId')
  detalle(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Param('patinadorId', ParseIntPipe) patinadorId: number,
  ) {
    return this.autorizacionesService.detalle(usuario, patinadorId);
  }

  /** CA-01: registrar con la identidad del acudiente, la fecha y hora y la versión del texto. */
  @Post(':patinadorId')
  registrar(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Param('patinadorId', ParseIntPipe) patinadorId: number,
    @Body() dto: RegistrarAutorizacionDto,
  ) {
    return this.autorizacionesService.registrar(usuario, patinadorId, dto);
  }
}
