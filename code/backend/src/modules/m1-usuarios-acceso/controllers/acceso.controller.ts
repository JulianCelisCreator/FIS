import { Body, Controller, HttpCode, HttpStatus, Post, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import {
  COOKIE_SESION,
  leerCookie,
  opcionesCookieSesion,
} from '../../../common/auth/token-sesion.js';
import { ActivarCuentaDto } from '../dto/activar-cuenta.dto.js';
import { IniciarSesionDto } from '../dto/iniciar-sesion.dto.js';
import { RestablecerContrasenaDto, SolicitarRecuperacionDto, TokenRecuperacionDto } from '../dto/recuperacion.dto.js';
import { ActivacionService } from '../services/activacion.service.js';
import { CierreSesionService } from '../services/cierre-sesion.service.js';
import { IngresoService } from '../services/ingreso.service.js';
import { RecuperacionService } from '../services/recuperacion.service.js';

/** Pantalla pública de ingreso: no exige sesión. */
@Controller('m1/acceso')
export class AccesoController {
  constructor(
    private readonly ingresoService: IngresoService,
    private readonly cierreSesionService: CierreSesionService,
    private readonly recuperacionService: RecuperacionService,
    private readonly activacionService: ActivacionService,
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
   * HU-M1-12: primer ingreso de una cuenta «Por registrar». Reemplaza la
   * contraseña temporal, activa la cuenta y deja la sesión abierta, igual que
   * el ingreso.
   */
  @Post('activacion')
  @HttpCode(HttpStatus.OK)
  async activar(
    @Body() dto: ActivarCuentaDto,
    @Req() solicitud: Request,
    @Res({ passthrough: true }) respuesta: Response,
  ) {
    const { token, expiraEn, sesion } = await this.activacionService.activar(dto, {
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

  /** HU-M1-08 CA-01: pedir el enlace. Responde lo mismo exista o no la cuenta. */
  @Post('recuperacion')
  @HttpCode(HttpStatus.OK)
  solicitarRecuperacion(@Body() dto: SolicitarRecuperacionDto) {
    return this.recuperacionService.solicitar(dto.correo);
  }

  /** HU-M1-08 CA-02: ¿el enlace sigue sirviendo? El token va en el cuerpo, no en la URL. */
  @Post('recuperacion/validar')
  @HttpCode(HttpStatus.OK)
  validarRecuperacion(@Body() dto: TokenRecuperacionDto) {
    return this.recuperacionService.validar(dto.token);
  }

  /** HU-M1-08 CA-03, CA-04 y CA-06: definir la nueva contraseña con el enlace. */
  @Post('recuperacion/restablecer')
  @HttpCode(HttpStatus.OK)
  restablecer(@Body() dto: RestablecerContrasenaDto) {
    return this.recuperacionService.restablecer(dto.token, dto.contrasena);
  }
}
