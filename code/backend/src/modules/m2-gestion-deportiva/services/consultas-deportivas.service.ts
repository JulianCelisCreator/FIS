import { Injectable, NotFoundException } from '@nestjs/common';
import type { UsuarioAutenticado } from '../../../common/auth/usuario-autenticado.js';
import { BaseDatosService } from '../../../common/database/base-datos.service.js';
import { HistorialRepository } from '../repositories/historial.repository.js';
import { AlcanceService } from './alcance.service.js';

@Injectable()
export class ConsultasDeportivasService {
  constructor(
    private readonly baseDatos: BaseDatosService,
    private readonly historial: HistorialRepository,
    private readonly alcance: AlcanceService,
  ) {}

  /**
   * RF-M2-10, RF-M2-15 y RF-M2-22. El administrador y el profesor ven además las
   * evaluaciones (calificaciones pasadas); el patinador solo su trayectoria.
   */
  async historialDe(patinadorId: number, usuario: UsuarioAutenticado) {
    const db = this.baseDatos.consultor;
    const { propio } = await this.alcance.exigirAccesoAlHistorial(db, usuario, patinadorId);
    const nombre = await this.historial.nombrePatinador(db, patinadorId);
    if (!nombre) throw new NotFoundException('No se encontró el perfil activo del patinador');
    const trayectoria = await this.historial.trayectoria(db, patinadorId);
    if (propio) return { patinadorId, nombre, trayectoria };
    return { patinadorId, nombre, trayectoria, evaluaciones: await this.historial.evaluaciones(db, patinadorId) };
  }

  /** RF-M2-18 (acudiente) y RF-M2-21 (patinador): categoría vigente de cada patinador a su cargo. */
  categoriaActual(usuario: UsuarioAutenticado) {
    return this.historial.categoriaActualDe(this.baseDatos.consultor, usuario.id);
  }
}
