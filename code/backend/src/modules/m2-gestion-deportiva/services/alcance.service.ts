import { ForbiddenException, Injectable } from '@nestjs/common';
import { Rol, type UsuarioAutenticado } from '../../../common/auth/usuario-autenticado.js';
import type { Consultor } from '../../../common/database/base-datos.service.js';
import { AlcanceRepository } from '../repositories/alcance.repository.js';

@Injectable()
export class AlcanceService {
  constructor(private readonly alcance: AlcanceRepository) {}

  esAdministrador(usuario: UsuarioAutenticado): boolean {
    return usuario.roles.includes(Rol.ADMINISTRADOR);
  }

  /** Administrador: cualquiera. Profesor: solo patinadores de sus grupos (precondición de RF-M2-11 a RF-M2-16). */
  async exigirAccesoComoProfesor(db: Consultor, usuario: UsuarioAutenticado, patinadorId: number): Promise<void> {
    if (this.esAdministrador(usuario)) return;
    if (usuario.roles.includes(Rol.PROFESOR) && await this.alcance.profesorTienePatinador(db, usuario.id, patinadorId)) return;
    throw new ForbiddenException('El patinador no pertenece a tus grupos asignados');
  }

  /** Administrador, profesor del patinador o el propio patinador (historial, RF-M2-10, 15 y 22). */
  async exigirAccesoAlHistorial(db: Consultor, usuario: UsuarioAutenticado, patinadorId: number): Promise<{ propio: boolean }> {
    if (this.esAdministrador(usuario)) return { propio: false };
    if (usuario.roles.includes(Rol.PROFESOR) && await this.alcance.profesorTienePatinador(db, usuario.id, patinadorId)) {
      return { propio: false };
    }
    if (usuario.roles.includes(Rol.PATINADOR) && await this.alcance.esElPatinador(db, usuario.id, patinadorId)) {
      return { propio: true };
    }
    throw new ForbiddenException('No tienes acceso al historial de este patinador');
  }
}
