import { Injectable, NotFoundException } from '@nestjs/common';
import { Rol, type UsuarioAutenticado } from '../../../common/auth/usuario-autenticado.js';
import { BaseDatosService } from '../../../common/database/base-datos.service.js';
import { NivelActualRepository } from '../repositories/nivel-actual.repository.js';

@Injectable()
export class NivelActualService {
  constructor(private readonly baseDatos: BaseDatosService, private readonly niveles: NivelActualRepository) {}

  listarPerfiles(usuario: UsuarioAutenticado) {
    return this.niveles.listarPerfilesConsultables(
      this.baseDatos.consultor,
      usuario.id,
      usuario.roles.includes(Rol.ADMINISTRADOR),
    );
  }

  async consultar(patinadorId: number, usuario: UsuarioAutenticado) {
    const perfil = await this.niveles.buscarPerfilConsultable(
      this.baseDatos.consultor,
      patinadorId,
      usuario.id,
      usuario.roles.includes(Rol.ADMINISTRADOR),
    );
    if (!perfil) throw new NotFoundException('No se encontró un perfil disponible para tu cuenta');
    return perfil;
  }
}
