import { Module } from '@nestjs/common';
import { AccesoController } from './controllers/acceso.controller.js';
import { AutorizacionesController } from './controllers/autorizaciones.controller.js';
import { CuentasController } from './controllers/cuentas.controller.js';
import { MiCuentaController } from './controllers/mi-cuenta.controller.js';
import { AutorizacionesRepository } from './repositories/autorizaciones.repository.js';
import { SesionesRepository } from './repositories/sesiones.repository.js';
import { TokensRepository } from './repositories/tokens.repository.js';
import { UsuariosRepository } from './repositories/usuarios.repository.js';
import { AutorizacionesService } from './services/autorizaciones.service.js';
import { CambioContrasenaService } from './services/cambio-contrasena.service.js';
import { CierreSesionService } from './services/cierre-sesion.service.js';
import { CuentasService } from './services/cuentas.service.js';
import { GestionCuentasService } from './services/gestion-cuentas.service.js';
import { IngresoService } from './services/ingreso.service.js';
import { RecuperacionService } from './services/recuperacion.service.js';
import { RolesService } from './services/roles.service.js';
import { VerificacionService } from './services/verificacion.service.js';

/** M1 · Usuarios y Acceso. */
@Module({
  controllers: [
    AccesoController,
    CuentasController,
    AutorizacionesController,
    MiCuentaController,
  ],
  providers: [
    CuentasService,
    GestionCuentasService,
    RolesService,
    IngresoService,
    CierreSesionService,
    AutorizacionesService,
    RecuperacionService,
    CambioContrasenaService,
    VerificacionService,
    UsuariosRepository,
    SesionesRepository,
    AutorizacionesRepository,
    TokensRepository,
  ],
  // M4 (RF-M4-09) reutiliza la validación de la autorización sin pasar por la pantalla.
  exports: [AutorizacionesService],
})
export class M1UsuariosAccesoModule {}
