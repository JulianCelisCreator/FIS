import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditoriaRepository } from '../../../common/auditoria/auditoria.repository.js';
import type { UsuarioAutenticado } from '../../../common/auth/usuario-autenticado.js';
import { BaseDatosService } from '../../../common/database/base-datos.service.js';
import type { CrearNivelDto, EditarNivelDto } from '../dto/niveles.dto.js';
import { NivelesRepository } from '../repositories/niveles.repository.js';

@Injectable()
export class NivelesService {
  constructor(
    private readonly baseDatos: BaseDatosService,
    private readonly niveles: NivelesRepository,
    private readonly auditoria: AuditoriaRepository,
  ) {}

  listar() {
    return this.niveles.listar(this.baseDatos.consultor);
  }

  async crear(dto: CrearNivelDto, usuario: UsuarioAutenticado) {
    try {
      return await this.baseDatos.transaccion(async (consultor) => {
        const nivel = await this.niveles.crear(consultor, {
          nombre: dto.nombre.trim(),
          descripcion: dto.descripcion?.trim() || null,
          orden: dto.orden,
        });
        await this.auditoria.registrar(consultor, {
          modulo: 'M2', tabla: 'nivel', registroId: nivel.id, accion: 'CREAR_NIVEL',
          valorNuevo: nivel, usuarioId: usuario.id,
        });
        return nivel;
      });
    } catch (error) {
      if (this.esDuplicado(error)) throw new ConflictException('Ya existe un nivel con ese nombre o número de orden');
      throw error;
    }
  }

  async actualizar(id: number, dto: EditarNivelDto, usuario: UsuarioAutenticado) {
    const cambios: { nombre?: string; descripcion?: string | null; orden?: number; activo?: boolean } = {};
    if (dto.nombre !== undefined) cambios.nombre = dto.nombre.trim();
    if (Object.hasOwn(dto, 'descripcion')) cambios.descripcion = dto.descripcion?.trim() || null;
    if (dto.orden !== undefined) cambios.orden = dto.orden;
    if (dto.activo !== undefined) cambios.activo = dto.activo;
    if (Object.keys(cambios).length === 0) throw new BadRequestException('Indica al menos un cambio para guardar');

    try {
      return await this.baseDatos.transaccion(async (consultor) => {
        const anterior = await this.niveles.buscar(consultor, id);
        if (!anterior) throw new NotFoundException('No se encontró el nivel solicitado');
        const actualizado = await this.niveles.actualizar(consultor, id, cambios);
        if (!actualizado) throw new NotFoundException('No se encontró el nivel solicitado');
        await this.auditoria.registrar(consultor, {
          modulo: 'M2', tabla: 'nivel', registroId: id, accion: 'ACTUALIZAR_NIVEL',
          valorAnterior: anterior, valorNuevo: actualizado, usuarioId: usuario.id,
        });
        return actualizado;
      });
    } catch (error) {
      if (this.esDuplicado(error)) throw new ConflictException('Ya existe un nivel con ese nombre o número de orden');
      throw error;
    }
  }

  private esDuplicado(error: unknown): boolean {
    return typeof error === 'object' && error !== null && 'code' in error && error.code === '23505';
  }
}
