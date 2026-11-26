import { Module } from '@nestjs/common';
import { PerfilesPatinadorController } from './controllers/perfiles-patinador.controller.js';
import { PerfilesPatinadorRepository } from './repositories/perfiles-patinador.repository.js';
import { PerfilesPatinadorService } from './services/perfiles-patinador.service.js';

@Module({
  controllers: [PerfilesPatinadorController],
  providers: [PerfilesPatinadorService, PerfilesPatinadorRepository],
  exports: [PerfilesPatinadorService],
})
export class M2GestionDeportivaModule {}
import { Module } from '@nestjs/common';
import { AsociacionesController } from './controllers/asociaciones.controller.js';
import { AsociacionesRepository } from './repositories/asociaciones.repository.js';
import { AsociacionesService } from './services/asociaciones.service.js';

@Module({
  controllers: [AsociacionesController],
  providers: [AsociacionesService, AsociacionesRepository],
  exports: [AsociacionesService],
})
export class M2GestionDeportivaModule {}
