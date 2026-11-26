import { Global, Module } from '@nestjs/common';
import { CorreoService } from './correo.service.js';

/** Correo saliente transversal (Resend o consola). Lo usan M1 y, más adelante, otros módulos. */
@Global()
@Module({
  providers: [CorreoService],
  exports: [CorreoService],
})
export class CorreoModule {}
