import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlanAuditLog } from './entities/plan-audit-log.entity';
import { PlanTariff } from './entities/plan-tariff.entity';
import { ServicePlan } from './entities/service-plan.entity';
import { PlanesController } from './planes.controller';
import { PlanesService } from './planes.service';
import { RolesGuard } from './auth/roles.guard';

@Module({
  imports: [TypeOrmModule.forFeature([ServicePlan, PlanTariff, PlanAuditLog])],
  controllers: [PlanesController],
  providers: [PlanesService, RolesGuard],
  exports: [PlanesService],
})
export class PlanesModule {}
