import { Module } from '@nestjs/common';
import { CuentasController } from './controllers/cuentas.controller.js';
import { UsuariosRepository } from './repositories/usuarios.repository.js';
import { CuentasService } from './services/cuentas.service.js';

/** M1 · Usuarios y Acceso. */
@Module({
  controllers: [CuentasController],
  providers: [CuentasService, UsuariosRepository],
})
export class M1UsuariosAccesoModule {}
