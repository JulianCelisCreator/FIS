import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { AutenticacionGuard } from '../../../common/auth/autenticacion.guard.js';
import { UsuarioActual } from '../../../common/auth/decoradores.js';
import { COOKIE_SESION, leerCookie } from '../../../common/auth/token-sesion.js';
import type { UsuarioAutenticado } from '../../../common/auth/usuario-autenticado.js';
import { CambiarContrasenaDto } from '../dto/recuperacion.dto.js';
import { CambioContrasenaService } from '../services/cambio-contrasena.service.js';
import { VerificacionService } from '../services/verificacion.service.js';

/** «Mi cuenta»: lo que cada persona hace sobre su propia cuenta, con cualquier rol. */
@Controller('m1/mi-cuenta')
@UseGuards(AutenticacionGuard)
export class MiCuentaController {
  constructor(
    private readonly cambioContrasenaService: CambioContrasenaService,
    private readonly verificacionService: VerificacionService,
  ) {}

  /** HU-M1-04 CA-04: nombre, correo y si el correo está verificado. */
  @Get()
  consultar(@UsuarioActual() usuario: UsuarioAutenticado) {
    return this.verificacionService.estado(usuario.id);
  }

  /** HU-M1-04: «Reenviar enlace» del aviso del AppShell. */
  @Post('verificacion')
  @HttpCode(HttpStatus.OK)
  reenviarVerificacion(@UsuarioActual() usuario: UsuarioAutenticado) {
    return this.verificacionService.reenviarPropio(usuario.id);
  }

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
