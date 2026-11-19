import { Body, Controller, Header, Post, UseGuards } from '@nestjs/common';
import { AutenticacionGuard } from '../../../common/auth/autenticacion.guard.js';
import { Roles, UsuarioActual } from '../../../common/auth/decoradores.js';
import { RolesGuard } from '../../../common/auth/roles.guard.js';
import { Rol, type UsuarioAutenticado } from '../../../common/auth/usuario-autenticado.js';
import { CrearCuentaDto } from '../dto/crear-cuenta.dto.js';
import { CuentasService } from '../services/cuentas.service.js';

@Controller('m1/cuentas')
@UseGuards(AutenticacionGuard, RolesGuard)
@Roles(Rol.ADMINISTRADOR)
export class CuentasController {
  constructor(private readonly cuentasService: CuentasService) {}

  /**
   * HU-M1-01: el Administrador crea una cuenta con su rol (HU-M1-07: el guard de
   * roles corta a cualquier otro rol con 403 antes de llegar al servicio). La respuesta trae
   * la contraseña temporal, así que no se guarda en ninguna caché.
   */
  @Post()
  @Header('Cache-Control', 'no-store')
  crear(@UsuarioActual() administrador: UsuarioAutenticado, @Body() dto: CrearCuentaDto) {
    return this.cuentasService.crear(administrador, dto);
  }
}