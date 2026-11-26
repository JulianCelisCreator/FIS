import { Body, Controller, HttpCode, HttpStatus, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { AutenticacionGuard } from '../../../common/auth/autenticacion.guard.js';
import { UsuarioActual } from '../../../common/auth/decoradores.js';
import { COOKIE_SESION, leerCookie } from '../../../common/auth/token-sesion.js';
import type { UsuarioAutenticado } from '../../../common/auth/usuario-autenticado.js';
import { CambiarContrasenaDto } from '../dto/recuperacion.dto.js';
import { CambioContrasenaService } from '../services/cambio-contrasena.service.js';

/** «Mi cuenta»: lo que cada persona hace sobre su propia cuenta, con cualquier rol. */
@Controller('m1/mi-cuenta')
@UseGuards(AutenticacionGuard)
export class MiCuentaController {
  constructor(private readonly cambioContrasenaService: CambioContrasenaService) {}

  /** HU-M1-08 CA-05: cambiar la contraseña; las demás sesiones de la cuenta se cierran. */
  @Post('contrasena')
  @HttpCode(HttpStatus.OK)
  cambiarContrasena(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Req() solicitud: Request,
    @Body() dto: CambiarContrasenaDto,
  ) {
    return this.cambioContrasenaService.cambiar(
      usuario,
      leerCookie(solicitud.headers.cookie, COOKIE_SESION),
      dto.contrasenaActual,
      dto.contrasenaNueva,
    );
  }
}
