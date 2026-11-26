import { Body, Controller, Get, Param, ParseIntPipe, Post, Query, UseGuards } from '@nestjs/common';
import { AutenticacionGuard } from '../../../common/auth/autenticacion.guard.js';
import { RequierePermiso, UsuarioActual } from '../../../common/auth/decoradores.js';
import { PermisosGuard } from '../../../common/auth/permisos.guard.js';
import type { UsuarioAutenticado } from '../../../common/auth/usuario-autenticado.js';
import { AsignarCategoriaDto, ProponerCambioCategoriaDto, RechazarPropuestaDto } from '../dto/asignaciones.dto.js';
import { PermisoM2Seguimiento } from '../enums/permiso-m2-seguimiento.enum.js';
import { AsignacionesService } from '../services/asignaciones.service.js';

/** RF-M2-08 (asignar), RF-M2-09 (cambiar) y RF-M2-16 (proponer o promover). */
@Controller('m2')
@UseGuards(AutenticacionGuard, PermisosGuard)
export class AsignacionesController {
  constructor(private readonly asignaciones: AsignacionesService) {}

  @Get('asignaciones/patinadores')
  @RequierePermiso(PermisoM2Seguimiento.ASIGNACION_GESTIONAR)
  listarPatinadores(@Query('buscar') buscar?: string) {
    return this.asignaciones.listarPatinadores(buscar);
  }

  @Post('patinadores/:id/categoria')
  @RequierePermiso(PermisoM2Seguimiento.ASIGNACION_GESTIONAR)
  asignar(@Param('id', ParseIntPipe) id: number, @Body() dto: AsignarCategoriaDto, @UsuarioActual() usuario: UsuarioAutenticado) {
    return this.asignaciones.asignar(id, dto, usuario);
  }

  @Post('patinadores/:id/categoria/cambio')
  @RequierePermiso(PermisoM2Seguimiento.ASIGNACION_GESTIONAR)
  cambiar(@Param('id', ParseIntPipe) id: number, @Body() dto: AsignarCategoriaDto, @UsuarioActual() usuario: UsuarioAutenticado) {
    return this.asignaciones.cambiar(id, dto, usuario);
  }

  @Post('propuestas-categoria')
  @RequierePermiso(PermisoM2Seguimiento.CATEGORIA_PROPONER, PermisoM2Seguimiento.CATEGORIA_PROMOVER_DIRECTO)
  proponer(@Body() dto: ProponerCambioCategoriaDto, @UsuarioActual() usuario: UsuarioAutenticado) {
    return this.asignaciones.proponer(dto, usuario);
  }

  @Get('propuestas-categoria')
  @RequierePermiso(PermisoM2Seguimiento.ASIGNACION_GESTIONAR, PermisoM2Seguimiento.CATEGORIA_PROPONER)
  listarPropuestas(@UsuarioActual() usuario: UsuarioAutenticado, @Query('estado') estado?: string) {
    return this.asignaciones.listarPropuestas(usuario, estado);
  }

  @Post('propuestas-categoria/:id/aprobar')
  @RequierePermiso(PermisoM2Seguimiento.ASIGNACION_GESTIONAR)
  aprobar(@Param('id', ParseIntPipe) id: number, @UsuarioActual() usuario: UsuarioAutenticado) {
    return this.asignaciones.aprobar(id, usuario);
  }

  @Post('propuestas-categoria/:id/rechazar')
  @RequierePermiso(PermisoM2Seguimiento.ASIGNACION_GESTIONAR)
  rechazar(@Param('id', ParseIntPipe) id: number, @Body() dto: RechazarPropuestaDto, @UsuarioActual() usuario: UsuarioAutenticado) {
    return this.asignaciones.rechazar(id, dto, usuario);
  }
}
