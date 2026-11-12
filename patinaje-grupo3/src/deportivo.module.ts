import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { entities } from './entities';
import { DeportivoController } from './deportivo.controller';
import { DeportivoService } from './deportivo.service';
import { AdminGuard } from './auth.guard';
@Module({imports:[TypeOrmModule.forFeature(entities)],controllers:[DeportivoController],providers:[DeportivoService,AdminGuard]})
export class DeportivoModule {}
