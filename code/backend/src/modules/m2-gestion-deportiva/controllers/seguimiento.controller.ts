import { Body, Controller, Get, Param, ParseIntPipe, Post, Put, UseGuards } from '@nestjs/common';
import { AutenticacionGuard } from '../../../common/auth/autenticacion.guard.js';
import { RequierePermiso, UsuarioActual } from '../../../common/auth/decoradores.js';
import { PermisosGuard } from '../../../common/auth/permisos.guard.js';
import type { UsuarioAutenticado } from '../../../common/auth/usuario-autenticado.js';
import {
  CrearEvaluacionDto, CrearObservacionDto, HabilitarObservacionesDto, RegistrarHabilidadesDto,
} from '../dto/seguimiento.dto.js';
import { PermisoM2Seguimiento } from '../enums/permiso-m2-seguimiento.enum.js';
import { ConsultasDeportivasService } from '../services/consultas-deportivas.service.js';
import { SeguimientoService } from '../services/seguimiento.service.js';

/** RF-M2-10 a RF-M2-15, RF-M2-18, RF-M2-21 a RF-M2-23: seguimiento del profesor y consultas por rol. */
@Controller('m2')
@UseGuards(AutenticacionGuard, PermisosGuard)
export class SeguimientoController {
  constructor(
    private readonly seguimiento: SeguimientoService,
    private readonly consultas: ConsultasDeportivasService,
  ) {}

  @Get('entrenamiento/patinadores')
  @RequierePermiso(PermisoM2Seguimiento.ENTRENAMIENTO_CONSULTAR)
  listarEntrenamiento(@UsuarioActual() usuario: UsuarioAutenticado) {
    return this.seguimiento.listarParaEntrenamiento(usuario);
  }

  @Get('entrenamiento/patinadores/:id')
  @RequierePermiso(PermisoM2Seguimiento.ENTRENAMIENTO_CONSULTAR)
  ficha(@Param('id', ParseIntPipe) id: number, @UsuarioActual() usuario: UsuarioAutenticado) {
    return this.seguimiento.ficha(id, usuario);
  }

  @Post('patinadores/:id/evaluaciones')
  @RequierePermiso(PermisoM2Seguimiento.SEGUIMIENTO_REGISTRAR)
  evaluar(@Param('id', ParseIntPipe) id: number, @Body() dto: CrearEvaluacionDto, @UsuarioActual() usuario: UsuarioAutenticado) {
    return this.seguimiento.evaluar(id, dto, usuario);
  }

  @Get('patinadores/:id/habilidades')
  @RequierePermiso(PermisoM2Seguimiento.ENTRENAMIENTO_CONSULTAR)
  habilidades(@Param('id', ParseIntPipe) id: number, @UsuarioActual() usuario: UsuarioAutenticado) {
    return this.seguimiento.habilidades(id, usuario);
  }

  @Put('patinadores/:id/habilidades')
  @RequierePermiso(PermisoM2Seguimiento.SEGUIMIENTO_REGISTRAR)
  registrarHabilidades(@Param('id', ParseIntPipe) id: number, @Body() dto: RegistrarHabilidadesDto, @UsuarioActual() usuario: UsuarioAutenticado) {
    return this.seguimiento.registrarHabilidades(id, dto, usuario);
  }

  @Post('patinadores/:id/observaciones')
  @RequierePermiso(PermisoM2Seguimiento.SEGUIMIENTO_REGISTRAR)
  crearObservacion(@Param('id', ParseIntPipe) id: number, @Body() dto: CrearObservacionDto, @UsuarioActual() usuario: UsuarioAutenticado) {
    return this.seguimiento.crearObservacion(id, dto, usuario);
  }

  @Get('patinadores/:id/observaciones')
  @RequierePermiso(PermisoM2Seguimiento.ENTRENAMIENTO_CONSULTAR)
  listarObservaciones(@Param('id', ParseIntPipe) id: number, @UsuarioActual() usuario: UsuarioAutenticado) {
    return this.seguimiento.listarObservaciones(id, usuario);
  }

  @Get('patinadores/:id/historial')
  @RequierePermiso(PermisoM2Seguimiento.HISTORIAL_CONSULTAR)
  historial(@Param('id', ParseIntPipe) id: number, @UsuarioActual() usuario: UsuarioAutenticado) {
    return this.consultas.historialDe(id, usuario);
  }

  @Get('categoria-actual')
  @RequierePermiso(PermisoM2Seguimiento.CATEGORIA_ACTUAL_CONSULTAR)
  categoriaActual(@UsuarioActual() usuario: UsuarioAutenticado) {
    return this.consultas.categoriaActual(usuario);
  }

  @Get('mis-observaciones')
  @RequierePermiso(PermisoM2Seguimiento.OBSERVACION_PROPIA_CONSULTAR)
  misObservaciones(@UsuarioActual() usuario: UsuarioAutenticado) {
    return this.seguimiento.observacionesPropias(usuario);
  }

  @Get('parametros/observaciones-visibles')
  @RequierePermiso(PermisoM2Seguimiento.OBSERVACION_HABILITAR)
  estadoObservaciones() {
    return this.seguimiento.estadoObservaciones();
  }

  @Put('parametros/observaciones-visibles')
  @RequierePermiso(PermisoM2Seguimiento.OBSERVACION_HABILITAR)
  habilitarObservaciones(@Body() dto: HabilitarObservacionesDto, @UsuarioActual() usuario: UsuarioAutenticado) {
    return this.seguimiento.habilitarObservaciones(dto, usuario);
  }
}
