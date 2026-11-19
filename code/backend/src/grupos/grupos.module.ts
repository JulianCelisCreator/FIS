import { Module } from '@nestjs/common';
import { ExternalDependenciesModule } from '../external-dependencies/external-dependencies.module.js';
import { GruposController } from './grupos.controller.js';
import { GruposService } from './grupos.service.js';

@Module({
  imports: [ExternalDependenciesModule],
  controllers: [GruposController],
  providers: [GruposService],
  exports: [GruposService],
})
export class GruposModule {}
