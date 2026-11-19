import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import {
  AsignarProfesorDto,
  CambiarEstadoGrupoDto,
  CreateGrupoDto,
  UpdateGrupoDto,
} from './dto/create-grupo.dto.js';
import { CreateHorarioDto } from './dto/create-horario.dto.js';
import { GruposService } from './grupos.service.js';

/**
 * Controlador de Grupos (HU-3.1).
 * Expone API-M3-01 en GET /api/v1/grupos, y soporta además /v1/grupos y /grupos
 * para compatibilidad directa y a través del proxy /api de Vite.
 */
@Controller(['api/v1/grupos', 'v1/grupos', 'grupos'])
export class GruposController {
  constructor(private readonly gruposService: GruposService) {}

  /** API-M3-01: Listar grupos configurados con su aforo máximo, ocupados y alerta90 */
  @Get()
  findAll(@Headers('authorization') authorization?: string) {
    return this.gruposService.findAll(authorization);
  }

  /** Catálogos de dependencias temporales DEP-M2-01, DEP-M2-02 y DEP-G4-01 */
  @Get('catalogos')
  obtenerCatalogos(@Headers('authorization') authorization?: string) {
    return this.gruposService.obtenerCatalogosConfiguracion(authorization);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.gruposService.findOne(id);
  }

  @Post()
  create(@Body() createGrupoDto: CreateGrupoDto) {
    return this.gruposService.create(createGrupoDto);
  }

  @Patch(':id')
  actualizar(@Param('id') id: string, @Body() updateGrupoDto: UpdateGrupoDto) {
    return this.gruposService.actualizar(id, updateGrupoDto);
  }

  @Patch(':id/estado')
  cambiarEstado(
    @Param('id') id: string,
    @Body() dto: CambiarEstadoGrupoDto,
  ) {
    return this.gruposService.cambiarEstado(id, dto.activo);
  }

  @Post(':id/inscribir')
  registrarInscripcion(@Param('id') id: string) {
    return this.gruposService.registrarInscripcionEnGrupo(id);
  }

  @Patch(':id/profesor')
  asignarProfesor(
    @Param('id') id: string,
    @Body() asignarProfesorDto: AsignarProfesorDto,
  ) {
    return this.gruposService.asignarProfesor(id, asignarProfesorDto);
  }

  @Post(':id/horarios')
  agregarHorario(
    @Param('id') id: string,
    @Body() createHorarioDto: CreateHorarioDto,
  ) {
    return this.gruposService.agregarHorario(id, createHorarioDto);
  }
}
