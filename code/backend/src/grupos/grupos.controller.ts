import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  AsignarProfesorDto,
  AsignarProfesoresMultipleDto,
  CambiarEstadoGrupoDto,
  CreateGrupoDto,
  InscribirCambiarGrupoDto,
  UpdateGrupoDto,
} from './dto/create-grupo.dto.js';
import { CreateHorarioDto } from './dto/create-horario.dto.js';
import { GruposService } from './grupos.service.js';

/**
 * Controlador de Grupos (HU-3.1, HU-3.2 y HU-3.4).
 * Expone API-M3-01 en GET /api/v1/grupos y API-M3-04 en GET /api/v1/grupos/{id}/estudiantes.
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

  /** HU-3.4: Lista los perfiles de estudiantes y acudientes para selección/cambio de grupo */
  @Get('autogestion/perfiles')
  listarPerfilesAutogestion() {
    return this.gruposService.listarPerfilesAutogestionHU34();
  }

  /** HU-3.4: Consulta filtrada de grupos elegibles y estado actual del estudiante */
  @Get('autogestion/:estudianteId')
  obtenerContextoAutogestion(
    @Param('estudianteId') estudianteId: string,
    @Query('actorRol') actorRol?: 'ESTUDIANTE' | 'ACUDIENTE',
    @Query('acudienteId') acudienteId?: string,
  ) {
    return this.gruposService.obtenerContextoAutogestionGrupo(
      estudianteId,
      actorRol ?? 'ACUDIENTE',
      acudienteId,
    );
  }

  /** HU-3.4: Inscribir o cambiar de grupo validando menor de edad, póliza, cartera y cupo atómico */
  @Post('autogestion/cambiar')
  inscribirOCambiarGrupo(@Body() dto: InscribirCambiarGrupoDto) {
    return this.gruposService.inscribirOCambiarGrupoEstudiante(dto);
  }

  /**
   * API-M3-04: GET /api/v1/grupos/{id}/estudiantes
   * Consultar la lista de estudiantes inscritos en un grupo y su estado.
   */
  @Get(':id/estudiantes')
  obtenerEstudiantesDeGrupo(@Param('id') id: string) {
    return this.gruposService.obtenerEstudiantesDeGrupo(id);
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

  /** HU-3.2: Asignar un profesor individual a un grupo */
  @Patch(':id/profesor')
  asignarProfesor(
    @Param('id') id: string,
    @Body() asignarProfesorDto: AsignarProfesorDto,
  ) {
    return this.gruposService.asignarProfesor(id, asignarProfesorDto);
  }

  /** HU-3.2: Asignar uno o varios profesores a un grupo con validación de traslape */
  @Post(':id/profesores')
  asignarProfesoresMultiple(
    @Param('id') id: string,
    @Body() dto: AsignarProfesoresMultipleDto,
  ) {
    return this.gruposService.asignarProfesoresMultiple(id, dto);
  }

  /** HU-3.2: Quitar (desasignar) un profesor de un grupo */
  @Delete(':id/profesores/:profesorId')
  desasignarProfesor(
    @Param('id') id: string,
    @Param('profesorId') profesorId: string,
  ) {
    return this.gruposService.desasignarProfesor(id, profesorId);
  }

  @Post(':id/horarios')
  agregarHorario(
    @Param('id') id: string,
    @Body() createHorarioDto: CreateHorarioDto,
  ) {
    return this.gruposService.agregarHorario(id, createHorarioDto);
  }
}
