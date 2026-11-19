import { Global, Module } from '@nestjs/common';
import { BaseDatosService } from './base-datos.service.js';

/** Conexión a PostgreSQL (esquema en db/schema.sql). Global: la usan todos los módulos. */
@Global()
@Module({
  providers: [BaseDatosService],
  exports: [BaseDatosService],
})
export class BaseDatosModule {}
