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
