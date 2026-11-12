import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AuditoriaModule } from './common/auditoria/auditoria.module.js';
import { AuthModule } from './common/auth/auth.module.js';
import { BaseDatosModule } from './common/database/base-datos.module.js';
import { M6AdministracionReportesFinanzasInventarioModule } from './modules/m6-administracion-reportes-finanzas-inventario/m6-administracion-reportes-finanzas-inventario.module.js';
import { M1UsuariosAccesoModule } from './modules/m1-usuarios-acceso/m1-usuarios-acceso.module.js';
import { M5PlanesTarifasPagosModule } from './modules/m5-planes-tarifas-pagos/m5-planes-tarifas-pagos.module.js';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    BaseDatosModule,
    AuditoriaModule,
    AuthModule,
    M6AdministracionReportesFinanzasInventarioModule,
    M1UsuariosAccesoModule,
    M5PlanesTarifasPagosModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
