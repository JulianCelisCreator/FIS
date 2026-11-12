import { Module } from '@nestjs/common';
import { AccesoController } from './controllers/acceso.controller.js';
import { CuentasController } from './controllers/cuentas.controller.js';
import { SesionesRepository } from './repositories/sesiones.repository.js';
import { UsuariosRepository } from './repositories/usuarios.repository.js';
import { CierreSesionService } from './services/cierre-sesion.service.js';
import { CuentasService } from './services/cuentas.service.js';
import { IngresoService } from './services/ingreso.service.js';

/** M1 · Usuarios y Acceso. */
@Module({
  controllers: [AccesoController, CuentasController],
  providers: [
    CuentasService,
    IngresoService,
    CierreSesionService,
    UsuariosRepository,
    SesionesRepository,
  ],
})
export class M1UsuariosAccesoModule {}