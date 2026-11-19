import { Module } from '@nestjs/common';
import { AccesoController } from './controllers/acceso.controller.js';
import { AutorizacionesController } from './controllers/autorizaciones.controller.js';
import { CuentasController } from './controllers/cuentas.controller.js';
import { AutorizacionesRepository } from './repositories/autorizaciones.repository.js';
import { SesionesRepository } from './repositories/sesiones.repository.js';
import { UsuariosRepository } from './repositories/usuarios.repository.js';
import { AutorizacionesService } from './services/autorizaciones.service.js';
import { CuentasService } from './services/cuentas.service.js';
import { IngresoService } from './services/ingreso.service.js';

/** M1 · Usuarios y Acceso. */
@Module({
  controllers: [AccesoController, CuentasController, AutorizacionesController],
  providers: [
    CuentasService,
    IngresoService,
    AutorizacionesService,
    UsuariosRepository,
    SesionesRepository,
    AutorizacionesRepository,
  ],
  // M4 (RF-M4-09) reutiliza la validación de la autorización sin pasar por la pantalla.
  exports: [AutorizacionesService],
})
export class M1UsuariosAccesoModule {}
