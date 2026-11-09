import { Module } from '@nestjs/common';
import { AccesoController } from './controllers/acceso.controller.js';
import { SesionesRepository } from './repositories/sesiones.repository.js';
import { UsuariosRepository } from './repositories/usuarios.repository.js';
import { IngresoService } from './services/ingreso.service.js';
import { RegistroService } from './services/registro.service.js';

/** M1 · Usuarios y Acceso. */
@Module({
  controllers: [AccesoController],
  providers: [RegistroService, IngresoService, UsuariosRepository, SesionesRepository],
})
export class M1UsuariosAccesoModule {}
