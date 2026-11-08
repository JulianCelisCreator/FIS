import { Module } from '@nestjs/common';
import { SesionController } from './sesion.controller.js';
import { SesionService } from './sesion.service.js';

/** Autenticación temporal de desarrollo; la reemplaza M1 con el inicio de sesión real. */
@Module({
  controllers: [SesionController],
  providers: [SesionService],
})
export class AuthModule {}
