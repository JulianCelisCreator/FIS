import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditoriaRepository } from '../../../common/auditoria/auditoria.repository.js';
import type { UsuarioAutenticado } from '../../../common/auth/usuario-autenticado.js';
import { BaseDatosService } from '../../../common/database/base-datos.service.js';
import type { VincularAcudienteDto } from '../dto/vincular-acudiente.dto.js';
import { AsociacionesRepository } from '../repositories/asociaciones.repository.js';

@Injectable()
export class AsociacionesService {
  constructor(
    private readonly baseDatos: BaseDatosService,
    private readonly asociaciones: AsociacionesRepository,
    private readonly auditoria: AuditoriaRepository,
  ) {}

  listarPatinadores(buscar?: string) {
    return this.asociaciones.listarPatinadores(this.baseDatos.consultor, buscar);
  }

  listarAcudientes(buscar?: string) {
    return this.asociaciones.listarAcudientes(this.baseDatos.consultor, buscar);
  }

  async vincular(patinadorId: number, dto: VincularAcudienteDto, usuario: UsuarioAutenticado) {
    const acudienteId = Number(dto.acudienteId);
    const parentesco = dto.parentesco.trim();
    if (!Number.isSafeInteger(acudienteId) || acudienteId < 1 || !parentesco) {
      throw new BadRequestException('Selecciona un acudiente y una relación válidos');
    }

    try {
      return await this.baseDatos.transaccion(async (consultor) => {
        if (!(await this.asociaciones.existePatinador(consultor, patinadorId))) {
          throw new NotFoundException('No se encontró el perfil activo del patinador');
        }
        if (!(await this.asociaciones.existeAcudiente(consultor, acudienteId))) {
          throw new NotFoundException('No se encontró una cuenta activa con rol de acudiente');
        }

        const vinculacion = await this.asociaciones.vincular(consultor, {
          patinadorId,
          acudienteId,
          parentesco,
          esPrincipal: dto.esPrincipal ?? false,
          vinculadoPor: usuario.id,
        });
        await this.auditoria.registrar(consultor, {
          modulo: 'M2',
          tabla: 'acudiente_patinador',
          registroId: vinculacion.id,
          accion: 'ASOCIAR_ACUDIENTE',
          valorNuevo: { patinadorId, acudienteId, parentesco, esPrincipal: dto.esPrincipal ?? false },
          usuarioId: usuario.id,
        });
        return { ...vinculacion, patinadorId, acudienteId, parentesco, esPrincipal: dto.esPrincipal ?? false };
      });
    } catch (error) {
      if (typeof error === 'object' && error !== null && 'code' in error && error.code === '23505') {
        throw new ConflictException('Ese acudiente ya está asociado al patinador');
      }
      throw error;
    }
  }
}
