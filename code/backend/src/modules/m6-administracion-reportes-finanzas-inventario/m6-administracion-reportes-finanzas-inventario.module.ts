import { Module } from '@nestjs/common';
import { UniformesController } from './controllers/uniformes.controller.js';
import { UniformesRepository } from './repositories/uniformes.repository.js';
import { UniformesService } from './services/uniformes.service.js';
import { ProveedoresController } from './controllers/proveedores.controller.js';
import { ProveedoresRepository } from './repositories/proveedores.repository.js';
import { ProveedoresService } from './services/proveedores.service.js';

/** M6 · Administración, reportes, finanzas e inventario. */
@Module({
  controllers: [UniformesController, ProveedoresController],
  providers: [UniformesRepository, UniformesService, ProveedoresRepository, ProveedoresService],
})
export class M6AdministracionReportesFinanzasInventarioModule {}
