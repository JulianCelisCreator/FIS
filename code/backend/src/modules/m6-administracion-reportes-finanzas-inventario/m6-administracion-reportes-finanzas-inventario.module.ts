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

/** M6 · Administración, reportes, finanzas e inventario. */
@Module({
  controllers: [UniformesController, ProveedoresController, PrestamosController],
  providers: [
    UniformesRepository, UniformesService,
    ProveedoresRepository, ProveedoresService,
    PrestamosRepository, PrestamosService,
  ],
})
export class M6AdministracionReportesFinanzasInventarioModule {}
