import { Module } from '@nestjs/common';
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

/** M6 · Administración, reportes, finanzas e inventario. */
@Module({
  controllers: [
    UniformesController, ProveedoresController, PrestamosController, VentasController,
    PersonalController,
  ],
  providers: [
    PersonalRepository, PersonalService,
    UniformesRepository, UniformesService,
    ProveedoresRepository, ProveedoresService,
    PrestamosRepository, PrestamosService,
    VentasRepository, VentasService, RegistroFinancieroVentaRepository,
  ],
})
export class M6AdministracionReportesFinanzasInventarioModule {}
