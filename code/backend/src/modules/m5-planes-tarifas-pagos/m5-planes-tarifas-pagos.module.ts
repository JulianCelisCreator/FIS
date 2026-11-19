import { Module } from '@nestjs/common';
import { AsignacionesController } from './controllers/asignaciones.controller.js';
import { CobrosController } from './controllers/cobros.controller.js';
import { PagosController } from './controllers/pagos.controller.js';
import { PatinadoresController } from './controllers/patinadores.controller.js';
import { PlanesController } from './controllers/planes.controller.js';
import { AsignacionesRepository } from './repositories/asignaciones.repository.js';
import { CobrosRepository } from './repositories/cobros.repository.js';
import { PagosRepository } from './repositories/pagos.repository.js';
import { PatinadoresRepository } from './repositories/patinadores.repository.js';
import { PlanesRepository } from './repositories/planes.repository.js';
import { AsignacionesService } from './services/asignaciones.service.js';
import { CobrosService } from './services/cobros.service.js';
import { PagosService } from './services/pagos.service.js';
import { PatinadoresService } from './services/patinadores.service.js';
import { PlanesService } from './services/planes.service.js';

/** M5 · Planes, Tarifas y Pagos. */
@Module({
  controllers: [
    PlanesController,
    PatinadoresController,
    AsignacionesController,
    CobrosController,
    PagosController,
  ],
  providers: [
    AsignacionesService,
    CobrosService,
    PagosService,
    PlanesService,
    PatinadoresService,
    AsignacionesRepository,
    CobrosRepository,
    PagosRepository,
    PatinadoresRepository,
    PlanesRepository,
  ],
})
export class M5PlanesTarifasPagosModule {}
