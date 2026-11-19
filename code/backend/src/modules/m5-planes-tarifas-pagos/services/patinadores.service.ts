import { Injectable } from '@nestjs/common';
import {
  Rol,
  type UsuarioAutenticado,
} from '../../../common/auth/usuario-autenticado.js';
import { BaseDatosService } from '../../../common/database/base-datos.service.js';
import { hoyEnClub } from '../../../common/utils/fecha-club.js';
import { PatinadoresRepository } from '../repositories/patinadores.repository.js';

/** Búsqueda de patinadores para las pantallas de M5, limitada a lo que cada rol puede ver. */
@Injectable()
export class PatinadoresService {
  constructor(
    private readonly baseDatos: BaseDatosService,
    private readonly patinadores: PatinadoresRepository,
  ) {}

  /**
   * Administrador y Contador ven a todos; el Acudiente, a los suyos; el
   * Patinador mayor de edad, a sí mismo (§5.4 de REQUIREMENTS).
   */
  buscar(usuario: UsuarioAutenticado, filtro: { texto?: string; patinadorId?: number } = {}) {
    const todos =
      usuario.roles.includes(Rol.ADMINISTRADOR) || usuario.roles.includes(Rol.CONTADOR);
    return this.patinadores.buscar(
      this.baseDatos.consultor,
      hoyEnClub(),
      { todos, usuarioId: usuario.id },
      filtro,
    );
  }
}
