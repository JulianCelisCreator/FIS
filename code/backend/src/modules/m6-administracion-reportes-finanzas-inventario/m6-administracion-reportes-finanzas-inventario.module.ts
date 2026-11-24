import { Module } from '@nestjs/common';
import { M1UsuariosAccesoModule } from '../m1-usuarios-acceso/m1-usuarios-acceso.module.js';
import { M5PlanesTarifasPagosModule } from '../m5-planes-tarifas-pagos/m5-planes-tarifas-pagos.module.js';
import { UniformesController } from './controllers/uniformes.controller.js';
import { UniformesRepository } from './repositories/uniformes.repository.js';
import { UniformesService } from './services/uniformes.service.js';
import { ProveedoresController } from './controllers/proveedores.controller.js';
import { ProveedoresRepository } from './repositories/proveedores.repository.js';
import { ProveedoresService } from './services/proveedores.service.js';
import { PrestamosController } from './controllers/prestamos.controller.js';
import { PrestamosRepository } from './repositories/prestamos.repository.js';
import { PrestamosService } from './services/prestamos.service.js';
import { VentasController } from './controllers/ventas.controller.js';
import { RegistroFinancieroVentaRepository } from './repositories/registro-financiero-venta.repository.js';
import { VentasRepository } from './repositories/ventas.repository.js';
import { VentasService } from './services/ventas.service.js';
import { PersonalController } from './controllers/personal.controller.js';
import { PersonalRepository } from './repositories/personal.repository.js';
import { PersonalService } from './services/personal.service.js';
import { ReportesController } from './controllers/reportes.controller.js';
import { ReportesRepository } from './repositories/reportes.repository.js';
import { ReportesService } from './services/reportes.service.js';
import { PanelController } from './controllers/panel.controller.js';
import { PanelRepository } from './repositories/panel.repository.js';
import { PanelService } from './services/panel.service.js';

/** M6 · Administración, reportes, finanzas e inventario. */
@Module({
  imports: [M1UsuariosAccesoModule, M5PlanesTarifasPagosModule],
  controllers: [
    UniformesController, ProveedoresController, PrestamosController, VentasController,
    PersonalController, ReportesController, PanelController,
  ],
  providers: [
    PersonalRepository, PersonalService,
    UniformesRepository, UniformesService,
    ProveedoresRepository, ProveedoresService,
    PrestamosRepository, PrestamosService,
    VentasRepository, VentasService, RegistroFinancieroVentaRepository,
    ReportesRepository, ReportesService,
    PanelRepository, PanelService,
  ],
})
export class M6AdministracionReportesFinanzasInventarioModule {}
