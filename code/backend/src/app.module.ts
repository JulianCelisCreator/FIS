import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AuditoriaModule } from './common/auditoria/auditoria.module.js';
import { BaseDatosModule } from './common/database/base-datos.module.js';
import { M5PlanesTarifasPagosModule } from './modules/m5-planes-tarifas-pagos/m5-planes-tarifas-pagos.module.js';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    BaseDatosModule,
    AuditoriaModule,
    M5PlanesTarifasPagosModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
