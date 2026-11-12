import { Body, Controller, HttpCode, HttpStatus, Post, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import {
  COOKIE_SESION,
  leerCookie,
  opcionesCookieSesion,
} from '../../../common/auth/token-sesion.js';
import { IniciarSesionDto } from '../dto/iniciar-sesion.dto.js';
import { CierreSesionService } from '../services/cierre-sesion.service.js';
import { IngresoService } from '../services/ingreso.service.js';

/** Pantalla pública de ingreso: no exige sesión. */
@Controller('m1/acceso')
export class AccesoController {
  constructor(
    private readonly ingresoService: IngresoService,
    private readonly cierreSesionService: CierreSesionService,
  ) {}

  /**
   * HU-M1-02: ingresar con correo y contraseña. El token viaja solo en una
   * cookie httpOnly; la respuesta trae el usuario, sus roles y sus permisos.
   */
  @Post('ingreso')
  @HttpCode(HttpStatus.OK)
  async ingresar(
    @Body() dto: IniciarSesionDto,
    @Req() solicitud: Request,
    @Res({ passthrough: true }) respuesta: Response,
  ) {
    const { token, expiraEn, sesion } = await this.ingresoService.iniciar(dto, {
      ip: solicitud.ip ?? null,
      userAgent: solicitud.get('user-agent') ?? null,
    });
    respuesta.cookie(COOKIE_SESION, token, { ...opcionesCookieSesion(), expires: expiraEn });
    return sesion;
  }

  /**
   * HU-M1-03: cerrar la sesión. Invalida la sesión en la base de datos y borra
   * la cookie. No usa el guard a propósito: si la sesión ya venció, la persona
   * igual debe poder salir y limpiar su navegador. Es idempotente.
   */
  @Post('salida')
  @HttpCode(HttpStatus.NO_CONTENT)
  async salir(@Req() solicitud: Request, @Res({ passthrough: true }) respuesta: Response) {
    await this.cierreSesionService.cerrar(leerCookie(solicitud.headers.cookie, COOKIE_SESION));
    respuesta.clearCookie(COOKIE_SESION, opcionesCookieSesion());
  }
}