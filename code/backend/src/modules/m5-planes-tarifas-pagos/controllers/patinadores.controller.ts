import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AutenticacionTemporalGuard } from '../../../common/auth/autenticacion-temporal.guard.js';
import { RequierePermiso, UsuarioActual } from '../../../common/auth/decoradores.js';
import { PermisosGuard } from '../../../common/auth/permisos.guard.js';
import type { UsuarioAutenticado } from '../../../common/auth/usuario-autenticado.js';
import { BuscarPatinadoresDto } from '../dto/buscar-patinadores.dto.js';
import { PermisoM5 } from '../enums/permiso-m5.enum.js';
import { PatinadoresService } from '../services/patinadores.service.js';

@Controller('m5/patinadores')
@UseGuards(AutenticacionTemporalGuard, PermisosGuard)
export class PatinadoresController {
  constructor(private readonly patinadoresService: PatinadoresService) {}

  /** Buscador de patinadores con su plan, matrícula y cartera (pantallas de asignación y pagos). */
  @Get()
  @RequierePermiso(PermisoM5.PLAN_CONSULTAR)
  buscar(@UsuarioActual() usuario: UsuarioAutenticado, @Query() dto: BuscarPatinadoresDto) {
    return this.patinadoresService.buscar(usuario, {
      texto: dto.buscar,
      patinadorId: dto.patinadorId,
    });
  }
}
