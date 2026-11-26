import { Module } from '@nestjs/common';
import { AsociacionesController } from './controllers/asociaciones.controller.js';
import { NivelesController } from './controllers/niveles.controller.js';
import { PerfilesPatinadorController } from './controllers/perfiles-patinador.controller.js';
import { AsociacionesRepository } from './repositories/asociaciones.repository.js';
import { NivelesRepository } from './repositories/niveles.repository.js';
import { PerfilesPatinadorRepository } from './repositories/perfiles-patinador.repository.js';
import { AsociacionesService } from './services/asociaciones.service.js';
import { NivelesService } from './services/niveles.service.js';
import { PerfilesPatinadorService } from './services/perfiles-patinador.service.js';

@Module({
  controllers: [PerfilesPatinadorController, AsociacionesController, NivelesController],
  providers: [
    PerfilesPatinadorService,
    PerfilesPatinadorRepository,
    AsociacionesService,
    AsociacionesRepository,
    NivelesService,
    NivelesRepository,
  ],
  exports: [PerfilesPatinadorService, AsociacionesService, NivelesService],
})
export class M2GestionDeportivaModule {}
