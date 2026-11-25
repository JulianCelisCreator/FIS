import { Module } from '@nestjs/common';
import { CategoriasController } from './controllers/categorias.controller.js';
import { CategoriasRepository } from './repositories/categorias.repository.js';
import { CategoriasService } from './services/categorias.service.js';

/**
 * M2 · Seguimiento deportivo: categorías, asignaciones, evaluaciones,
 * habilidades, observaciones, historiales y consultas por rol
 * (RF-M2-07 a RF-M2-23). Es un módulo aparte de M2GestionDeportivaModule
 * (perfiles, niveles y acudientes de los PR #44 a #47) para no editar sus archivos.
 */
@Module({
  controllers: [CategoriasController],
  providers: [CategoriasService, CategoriasRepository],
})
export class M2SeguimientoDeportivoModule {}
