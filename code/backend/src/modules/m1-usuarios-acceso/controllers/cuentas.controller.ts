import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AutenticacionGuard } from '../../../common/auth/autenticacion.guard.js';
import { UsuarioActual } from '../../../common/auth/decoradores.js';
import type { UsuarioAutenticado } from '../../../common/auth/usuario-autenticado.js';
import { CambiarRolDto } from '../dto/cambiar-rol.dto.js';
import { CrearCuentaDto } from '../dto/crear-cuenta.dto.js';
import { FiltrosCuentasDto } from '../dto/filtros-cuentas.dto.js';
import { CuentasService } from '../services/cuentas.service.js';
import { GestionCuentasService } from '../services/gestion-cuentas.service.js';
import { RolesService } from '../services/roles.service.js';

@Controller('m1/cuentas')
@UseGuards(AutenticacionGuard)
export class CuentasController {
  constructor(
    private readonly cuentasService: CuentasService,
    private readonly gestionCuentasService: GestionCuentasService,
    private readonly rolesService: RolesService,
  ) {}

  /** HU-M1-05 CA-01: listado «Usuarios» con búsqueda, filtros por rol y estado, y paginación. */
  @Get()
  listar(@UsuarioActual() administrador: UsuarioAutenticado, @Query() filtros: FiltrosCuentasDto) {
    return this.gestionCuentasService.listar(administrador, filtros);
  }

  /**
   * HU-M1-01: el Administrador crea una cuenta con su rol. La respuesta trae
   * la contraseña temporal, así que no se guarda en ninguna caché.
   */
  @Post()
  @Header('Cache-Control', 'no-store')
  crear(@UsuarioActual() administrador: UsuarioAutenticado, @Body() dto: CrearCuentaDto) {
    return this.cuentasService.crear(administrador, dto);
  }

  /** HU-M1-05 CA-03: desactivar (nunca eliminar). La cuenta conserva sus datos e historial. */
  @Post(':usuarioId/desactivar')
  @HttpCode(HttpStatus.OK)
  desactivar(
    @UsuarioActual() administrador: UsuarioAutenticado,
    @Param('usuarioId', ParseIntPipe) usuarioId: number,
  ) {
    return this.gestionCuentasService.desactivar(administrador, usuarioId);
  }

  /** HU-M1-06: asignar o cambiar el rol de una cuenta; el nuevo reemplaza al anterior. */
  @Patch(':usuarioId/rol')
  cambiarRol(
    @UsuarioActual() administrador: UsuarioAutenticado,
    @Param('usuarioId', ParseIntPipe) usuarioId: number,
    @Body() dto: CambiarRolDto,
  ) {
    return this.rolesService.cambiar(administrador, usuarioId, dto.rol);
  }

  /** HU-M1-05 CA-04: reactivar una cuenta desactivada. */
  @Post(':usuarioId/reactivar')
  @HttpCode(HttpStatus.OK)
  reactivar(
    @UsuarioActual() administrador: UsuarioAutenticado,
    @Param('usuarioId', ParseIntPipe) usuarioId: number,
  ) {
    return this.gestionCuentasService.reactivar(administrador, usuarioId);
  }
}
