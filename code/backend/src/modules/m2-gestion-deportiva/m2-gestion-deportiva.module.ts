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
