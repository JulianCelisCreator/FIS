import { Body, Controller, HttpCode, HttpStatus, Post, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import {
  COOKIE_SESION,
  leerCookie,
  opcionesCookieSesion,
} from '../../../common/auth/token-sesion.js';
import { IniciarSesionDto } from '../dto/iniciar-sesion.dto.js';
import { RegistrarUsuarioDto } from '../dto/registrar-usuario.dto.js';
import { IngresoService } from '../services/ingreso.service.js';
import { RegistroService } from '../services/registro.service.js';

/** Pantalla pública de acceso (W01): no exige sesión. */
@Controller('m1/acceso')
export class AccesoController {
  constructor(
    private readonly registroService: RegistroService,
    private readonly ingresoService: IngresoService,
  ) {}

  /** RF-M1-01: crear una cuenta propia (Patinador, Acudiente, Profesor o Visitante). */
  @Post('registro')
  registrar(@Body() dto: RegistrarUsuarioDto) {
    return this.registroService.registrar(dto);
  }

  /**
   * RF-M1-02: ingresar con correo, contraseña y rol. El token viaja solo en
   * una cookie httpOnly; la respuesta trae el usuario, su rol y sus permisos.
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

  /** RF-M1-03: cerrar la sesión actual. Responde 204 aunque no hubiera sesión. */
  @Post('salida')
  @HttpCode(HttpStatus.NO_CONTENT)
  async salir(@Req() solicitud: Request, @Res({ passthrough: true }) respuesta: Response) {
    await this.ingresoService.cerrar(leerCookie(solicitud.headers.cookie, COOKIE_SESION));
    respuesta.clearCookie(COOKIE_SESION, opcionesCookieSesion());
  }
}
