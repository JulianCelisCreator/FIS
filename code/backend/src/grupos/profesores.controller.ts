import { Controller, Get, Param, Query } from '@nestjs/common';
import { GruposService } from './grupos.service.js';

/**
 * Controlador de Profesores y Agenda Docente (HU-3.2).
 * Expone API-M3-02 en GET /api/v1/profesores/{id}/grupos
 * devolviendo [{ grupoId, nombreGrupo, rolDocente, horarios[] }].
 */
@Controller(['api/v1/profesores', 'v1/profesores', 'profesores'])
export class ProfesoresGrupoController {
  constructor(private readonly gruposService: GruposService) {}

  /**
   * Lista los profesores activos (DEP-M1-02) cruzados con su disponibilidad contractual (DEP-M6-01)
   * y evalúa en tiempo real si tienen conflicto de horario frente al grupo consultado.
   */
  @Get()
  listarProfesores(@Query('grupoId') grupoId?: string) {
    return this.gruposService.listarProfesoresConDisponibilidad(grupoId);
  }

  /**
   * API-M3-02: GET /api/v1/profesores/{id}/grupos
   * Consultar los grupos y horarios asignados a un profesor específico.
   */
  @Get(':id/grupos')
  obtenerGruposDelProfesor(@Param('id') id: string) {
    return this.gruposService.obtenerGruposPorProfesor(id);
  }

  /**
   * Perfil docente actualizado con su agenda de grupos y disponibilidad (DEP-M6-01).
   */
  @Get(':id/perfil')
  obtenerPerfilProfesor(@Param('id') id: string) {
    return this.gruposService.obtenerPerfilProfesor(id);
  }
}
