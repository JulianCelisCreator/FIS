import { Module } from '@nestjs/common';
import { AccesoController } from './controllers/acceso.controller.js';
import { AutorizacionesController } from './controllers/autorizaciones.controller.js';
import { CuentasController } from './controllers/cuentas.controller.js';
import { PolizasController } from './controllers/polizas.controller.js';
import { AutorizacionesRepository } from './repositories/autorizaciones.repository.js';
import { PolizasRepository } from './repositories/polizas.repository.js';
import { SesionesRepository } from './repositories/sesiones.repository.js';
import { UsuariosRepository } from './repositories/usuarios.repository.js';
import { AutorizacionesService } from './services/autorizaciones.service.js';
import { CierreSesionService } from './services/cierre-sesion.service.js';
import { CuentasService } from './services/cuentas.service.js';
import { GestionCuentasService } from './services/gestion-cuentas.service.js';
import { IngresoService } from './services/ingreso.service.js';
import { PolizasService } from './services/polizas.service.js';
import { RolesService } from './services/roles.service.js';
import { AlmacenPolizas } from './utils/archivo-poliza.js';

/** M1 · Usuarios y Acceso. */
@Module({
  controllers: [
    AccesoController,
    CuentasController,
    AutorizacionesController,
    PolizasController,
  ],
  providers: [
    CuentasService,
    GestionCuentasService,
    RolesService,
    IngresoService,
    CierreSesionService,
    AutorizacionesService,
    PolizasService,
    UsuariosRepository,
    SesionesRepository,
    AutorizacionesRepository,
    PolizasRepository,
    AlmacenPolizas,
  ],
  // M4 (RF-M4-09) reutiliza la validación de la autorización sin pasar por la pantalla.
  exports: [AutorizacionesService],
})
export class M1UsuariosAccesoModule {}
