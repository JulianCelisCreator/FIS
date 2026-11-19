import { Module } from '@nestjs/common';
import { M4Controller } from './controllers/m4.controller.js';
import { M4Repository } from './repositories/m4.repository.js';
import { M4Service } from './services/m4.service.js';

/** M4 · Competencias, Inscripciones y Resultados Deportivos. */
@Module({
  controllers: [M4Controller],
  providers: [M4Service, M4Repository],
})
export class M4CompetenciasResultadosModule {}
