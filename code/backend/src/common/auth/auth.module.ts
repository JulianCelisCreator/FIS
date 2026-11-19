import { Module } from '@nestjs/common';
import { SesionController } from './sesion.controller.js';
import { SesionService } from './sesion.service.js';

/** Sesión actual (GET /sesion). El inicio y cierre de sesión están en M1 (m1/acceso). */
@Module({
  controllers: [SesionController],
  providers: [SesionService],
})
export class AuthModule {}
