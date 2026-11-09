import { Body, Controller, Header, Post, UseGuards } from '@nestjs/common';
import { AutenticacionTemporalGuard } from '../../../common/auth/autenticacion-temporal.guard.js';
import { UsuarioActual } from '../../../common/auth/decoradores.js';
import type { UsuarioAutenticado } from '../../../common/auth/usuario-autenticado.js';
import { CrearCuentaDto } from '../dto/crear-cuenta.dto.js';
import { CuentasService } from '../services/cuentas.service.js';

@Controller('m1/cuentas')
@UseGuards(AutenticacionTemporalGuard)
export class CuentasController {
  constructor(private readonly cuentasService: CuentasService) {}

  /**
   * HU-M1-01: el Administrador crea una cuenta con su rol. La respuesta trae
   * la contraseña temporal, así que no se guarda en ninguna caché.
   */
  @Post()
  @Header('Cache-Control', 'no-store')
  crear(@UsuarioActual() administrador: UsuarioAutenticado, @Body() dto: CrearCuentaDto) {
    return this.cuentasService.crear(administrador, dto);
  }
}
