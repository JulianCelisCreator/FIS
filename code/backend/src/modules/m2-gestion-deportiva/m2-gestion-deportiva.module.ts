import { Module } from '@nestjs/common';
import { AsociacionesController } from './controllers/asociaciones.controller.js';
import { PerfilesPatinadorController } from './controllers/perfiles-patinador.controller.js';
import { AsociacionesRepository } from './repositories/asociaciones.repository.js';
import { PerfilesPatinadorRepository } from './repositories/perfiles-patinador.repository.js';
import { AsociacionesService } from './services/asociaciones.service.js';
import { PerfilesPatinadorService } from './services/perfiles-patinador.service.js';

@Module({
  controllers: [PerfilesPatinadorController, AsociacionesController],
  providers: [PerfilesPatinadorService, PerfilesPatinadorRepository, AsociacionesService, AsociacionesRepository],
  exports: [PerfilesPatinadorService, AsociacionesService],
})
export class M2GestionDeportivaModule {}
