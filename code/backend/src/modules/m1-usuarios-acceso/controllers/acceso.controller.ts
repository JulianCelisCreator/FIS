import { Body, Controller, HttpCode, HttpStatus, Post, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { COOKIE_SESION, opcionesCookieSesion } from '../../../common/auth/token-sesion.js';
import { IniciarSesionDto } from '../dto/iniciar-sesion.dto.js';
import { IngresoService } from '../services/ingreso.service.js';

/** Pantalla pública de ingreso: no exige sesión. */
@Controller('m1/acceso')
export class AccesoController {
  constructor(private readonly ingresoService: IngresoService) {}

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
}
