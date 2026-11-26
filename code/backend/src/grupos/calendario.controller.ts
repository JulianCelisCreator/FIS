import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ActualizarEventoGlobalDto,
  CrearEventoGlobalDto,
} from './dto/create-horario.dto.js';
import { GruposService } from './grupos.service.js';

/**
 * Controlador de Calendario General e Integrado de la Escuela (HU-3.5).
 * Expone API-M3-05 en GET /api/v1/calendario devolviendo
 * [{ eventoId, tipo, titulo, inicio, fin, ubicacion }] filtrado por rol y grupo (DEP-M1-01).
 */
@Controller(['api/v1/calendario', 'v1/calendario', 'calendario'])
export class CalendarioController {
  constructor(private readonly gruposService: GruposService) {}

  /**
   * API-M3-05: GET /api/v1/calendario
   * Consolida entrenamientos (HU-3.3), competencias (DEP-M4-01) y eventos globales
   * filtrados según el rol y pertenencia a grupo del usuario autenticado (DEP-M1-01).
   */
  @Get()
  listarEventos(
    @Headers('authorization') authorization?: string,
    @Query('token') tokenQuery?: string,
    @Query('tipo') tipo?: string,
    @Query('grupoId') grupoId?: string,
    @Query('fechaInicio') fechaInicio?: string,
    @Query('fechaFin') fechaFin?: string,
  ) {
    const authEfectivo = tokenQuery
      ? `Bearer ${tokenQuery}`
      : authorization;
    return this.gruposService.obtenerEventosCalendario(authEfectivo, {
      tipo,
      grupoId,
      fechaInicio,
      fechaFin,
    });
  }

  /**
   * Consulta enriquecida con el contexto de sesión y grupos asociados del usuario autenticado.
   */
  @Get('contexto')
  obtenerCalendarioConContexto(
    @Headers('authorization') authorization?: string,
    @Query('token') tokenQuery?: string,
    @Query('tipo') tipo?: string,
    @Query('grupoId') grupoId?: string,
  ) {
    const authEfectivo = tokenQuery
      ? `Bearer ${tokenQuery}`
      : authorization;
    return this.gruposService.obtenerCalendarioConContexto(authEfectivo, {
      tipo,
      grupoId,
    });
  }

  /**
   * HU-3.5: Crear un evento global del club (restringido exclusivamente al rol ADMIN).
   */
  @Post('eventos-globales')
  crearEventoGlobal(
    @Body() dto: CrearEventoGlobalDto,
    @Headers('authorization') authorization?: string,
    @Query('token') tokenQuery?: string,
  ) {
    const authEfectivo = tokenQuery
      ? `Bearer ${tokenQuery}`
      : authorization;
    return this.gruposService.crearEventoGlobal(dto, authEfectivo);
  }

  /**
   * HU-3.5: Editar un evento global del club (restringido exclusivamente al rol ADMIN).
   */
  @Patch('eventos-globales/:eventoId')
  actualizarEventoGlobal(
    @Param('eventoId') eventoId: string,
    @Body() dto: ActualizarEventoGlobalDto,
    @Headers('authorization') authorization?: string,
    @Query('token') tokenQuery?: string,
  ) {
    const authEfectivo = tokenQuery
      ? `Bearer ${tokenQuery}`
      : authorization;
    return this.gruposService.actualizarEventoGlobal(
      eventoId,
      dto,
      authEfectivo,
    );
  }

  /**
   * HU-3.5: Anular un evento global del club (restringido exclusivamente al rol ADMIN).
   */
  @Patch('eventos-globales/:eventoId/anular')
  anularEventoGlobal(
    @Param('eventoId') eventoId: string,
    @Headers('authorization') authorization?: string,
    @Query('token') tokenQuery?: string,
  ) {
    const authEfectivo = tokenQuery
      ? `Bearer ${tokenQuery}`
      : authorization;
    return this.gruposService.anularEventoGlobal(eventoId, authEfectivo);
  }
}
