import { Module } from '@nestjs/common';
import { NivelesController } from './controllers/niveles.controller.js';
import { NivelesRepository } from './repositories/niveles.repository.js';
import { NivelesService } from './services/niveles.service.js';

@Module({
  controllers: [NivelesController],
  providers: [NivelesService, NivelesRepository],
  exports: [NivelesService],
})
export class M2GestionDeportivaModule {}
