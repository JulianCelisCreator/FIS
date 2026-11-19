import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  CancelarHorarioDto,
  CreateHorarioDto,
  UpdateHorarioDto,
} from './dto/create-horario.dto.js';
import { GruposService } from './grupos.service.js';

/**
 * Controlador de Programación de Horarios de Clase (HU-3.3).
 * Expone API-M3-03 en GET /api/v1/horarios filtrable por grupo, sede o rango de fechas
 * devolviendo [{ horarioId, grupoId, diaSemana, horaInicio, horaFin, sedeId, estado }].
 */
@Controller(['api/v1/horarios', 'v1/horarios', 'horarios'])
export class HorariosController {
  constructor(private readonly gruposService: GruposService) {}

  /**
   * API-M3-03: GET /api/v1/horarios
   * Consultar las sesiones y horarios programados por grupo, sede o rango de fechas.
   */
  @Get()
  listarHorarios(
    @Query('grupoId') grupoId?: string,
    @Query('grupo') grupo?: string,
    @Query('sedeId') sedeId?: string,
    @Query('sede') sede?: string,
    @Query('fechaInicio') fechaInicio?: string,
    @Query('fechaFin') fechaFin?: string,
    @Query('incluirCancelados') incluirCancelados?: string,
  ) {
    return this.gruposService.listarHorarios({
      grupoId: grupoId ?? grupo,
      sedeId: sedeId ?? sede,
      fechaInicio,
      fechaFin,
      incluirCancelados: incluirCancelados === 'true',
    });
  }

  /**
   * Bandeja auditable de notificaciones enviadas por cambios o cancelaciones (DEP-M1-05).
   */
  @Get('notificaciones')
  listarNotificaciones() {
    return this.gruposService.listarNotificacionesHorarios();
  }

  /**
   * HU-3.3: Crear nueva franja horaria con validación anti-solapamiento de pista (DEP-G4-01).
   */
  @Post()
  crearHorario(@Body() dto: CreateHorarioDto) {
    return this.gruposService.crearHorario(dto);
  }

  /**
   * HU-3.3: Editar o reprogramar una franja horaria (ej. mediante Drag & Drop)
   * disparando automáticamente notificación en DEP-M1-05.
   */
  @Patch(':horarioId')
  actualizarHorario(
    @Param('horarioId') horarioId: string,
    @Body() dto: UpdateHorarioDto,
  ) {
    return this.gruposService.actualizarHorario(horarioId, dto);
  }

  /**
   * HU-3.3: Anular / cancelar una franja horaria con motivo obligatorio
   * disparando automáticamente notificación en DEP-M1-05.
   */
  @Patch(':horarioId/anular')
  anularHorario(
    @Param('horarioId') horarioId: string,
    @Body() dto: CancelarHorarioDto,
  ) {
    return this.gruposService.cancelarHorario(horarioId, dto);
  }
}
