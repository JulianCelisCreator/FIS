import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AutenticacionTemporalGuard } from '../../../common/auth/autenticacion-temporal.guard.js';
import { RequierePermiso, UsuarioActual } from '../../../common/auth/decoradores.js';
import { PermisosGuard } from '../../../common/auth/permisos.guard.js';
import type { UsuarioAutenticado } from '../../../common/auth/usuario-autenticado.js';
import {
  BuscarCuentasDto,
  CrearPersonalDto,
  DesactivarPersonalDto,
  EditarPersonalDto,
  FiltrosPersonalDto,
} from '../dto/personal.dto.js';
import { PermisoM6 } from '../enums/permiso-m6.enum.js';
import { PersonalService } from '../services/personal.service.js';

/**
 * Registro y administración del personal (HU-6.2). Solo el Administrador
 * (M6_PERSONAL_GESTIONAR). No hay DELETE: se desactiva sin borrar el historial.
 */
@Controller('m6/personal')
@UseGuards(AutenticacionTemporalGuard, PermisosGuard)
@RequierePermiso(PermisoM6.PERSONAL_GESTIONAR)
export class PersonalController {
  constructor(private readonly personal: PersonalService) {}

  @Get()
  listar(@Query() filtros: FiltrosPersonalDto) {
    return this.personal.listar(filtros);
  }

  /** Cuentas de M1 sin ficha laboral, para vincularlas. */
  @Get('cuentas-disponibles')
  cuentasDisponibles(@Query() filtros: BuscarCuentasDto) {
    return this.personal.cuentasDisponibles(filtros.buscar);
  }

  @Get(':personalId')
  detalle(@Param('personalId', ParseIntPipe) personalId: number) {
    return this.personal.detalle(personalId);
  }

  @Post()
  crear(@UsuarioActual() usuario: UsuarioAutenticado, @Body() dto: CrearPersonalDto) {
    return this.personal.crear(usuario, dto);
  }

  @Patch(':personalId')
  editar(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Param('personalId', ParseIntPipe) personalId: number,
    @Body() dto: EditarPersonalDto,
  ) {
    return this.personal.editar(personalId, usuario, dto);
  }

  @Post(':personalId/desactivar')
  desactivar(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Param('personalId', ParseIntPipe) personalId: number,
    @Body() dto: DesactivarPersonalDto,
  ) {
    return this.personal.desactivar(personalId, usuario, dto.motivo);
  }

  /** HU-6.3: asigna el rol Contador a la cuenta vinculada. */
  @Post(':personalId/rol-contador')
  asignarContador(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Param('personalId', ParseIntPipe) personalId: number,
  ) {
    return this.personal.asignarContador(personalId, usuario);
  }

  @Post(':personalId/rol-contador/retirar')
  retirarContador(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Param('personalId', ParseIntPipe) personalId: number,
  ) {
    return this.personal.retirarContador(personalId, usuario);
  }

  @Post(':personalId/reactivar')
  reactivar(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Param('personalId', ParseIntPipe) personalId: number,
  ) {
    return this.personal.reactivar(personalId, usuario);
  }
}
