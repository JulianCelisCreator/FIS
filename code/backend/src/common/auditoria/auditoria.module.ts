import { Global, Module } from '@nestjs/common';
import { AuditoriaRepository } from './auditoria.repository.js';

/** Auditoría transversal (M4, M5 y M6 registran aquí sus cambios sensibles). */
@Global()
@Module({
  providers: [AuditoriaRepository],
  exports: [AuditoriaRepository],
})
export class AuditoriaModule {}
