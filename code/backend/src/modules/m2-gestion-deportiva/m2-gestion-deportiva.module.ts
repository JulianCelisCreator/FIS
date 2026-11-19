import { Module } from '@nestjs/common';
import { NivelActualController } from './controllers/nivel-actual.controller.js';
import { NivelActualRepository } from './repositories/nivel-actual.repository.js';
import { NivelActualService } from './services/nivel-actual.service.js';

@Module({
  controllers: [NivelActualController],
  providers: [NivelActualService, NivelActualRepository],
  exports: [NivelActualService],
})
export class M2GestionDeportivaModule {}
