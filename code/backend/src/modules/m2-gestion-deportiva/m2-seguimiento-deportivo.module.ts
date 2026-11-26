import { Module } from '@nestjs/common';
import { AsignacionesController } from './controllers/asignaciones.controller.js';
import { SeguimientoController } from './controllers/seguimiento.controller.js';
import { CategoriasController } from './controllers/categorias.controller.js';
import { AlcanceRepository } from './repositories/alcance.repository.js';
import { HistorialRepository } from './repositories/historial.repository.js';
import { SeguimientoRepository } from './repositories/seguimiento.repository.js';
import { AsignacionesRepository } from './repositories/asignaciones.repository.js';
import { CategoriasRepository } from './repositories/categorias.repository.js';
import { AlcanceService } from './services/alcance.service.js';
import { ConsultasDeportivasService } from './services/consultas-deportivas.service.js';
import { SeguimientoService } from './services/seguimiento.service.js';
import { AsignacionesService } from './services/asignaciones.service.js';
import { CategoriasService } from './services/categorias.service.js';

/**
 * M2 · Seguimiento deportivo: categorías, asignaciones, evaluaciones,
 * habilidades, observaciones, historiales y consultas por rol
 * (RF-M2-07 a RF-M2-23). Es un módulo aparte de M2GestionDeportivaModule
 * (perfiles, niveles y acudientes de los PR #44 a #47) para no editar sus archivos.
 */
@Module({
  controllers: [CategoriasController, AsignacionesController, SeguimientoController],
  providers: [
    CategoriasService, CategoriasRepository,
    AsignacionesService, AsignacionesRepository,
    AlcanceService, AlcanceRepository,
    SeguimientoService, SeguimientoRepository,
    ConsultasDeportivasService, HistorialRepository,
  ],
})
export class M2SeguimientoDeportivoModule {}
