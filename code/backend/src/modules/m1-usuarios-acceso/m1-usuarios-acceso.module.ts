import { Module } from '@nestjs/common';
import { AccesoController } from './controllers/acceso.controller.js';
import { UsuariosRepository } from './repositories/usuarios.repository.js';
import { RegistroService } from './services/registro.service.js';

/** M1 · Usuarios y Acceso. */
@Module({
  controllers: [AccesoController],
  providers: [RegistroService, UsuariosRepository],
})
export class M1UsuariosAccesoModule {}
