import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { UsuarioAutenticado } from '../../../common/auth/usuario-autenticado.js';
import { AuditoriaRepository } from '../../../common/auditoria/auditoria.repository.js';
import { BaseDatosService } from '../../../common/database/base-datos.service.js';
import type { AjustarStockDto, CrearUniformeDto, EditarUniformeDto, FiltrosUniformesDto } from '../dto/uniformes.dto.js';
import { UniformesRepository } from '../repositories/uniformes.repository.js';

@Injectable()
export class UniformesService {
  constructor(
    private readonly uniformes: UniformesRepository,
    private readonly baseDatos: BaseDatosService,
    private readonly auditoria: AuditoriaRepository,
  ) {}

  listar(filtros: FiltrosUniformesDto) {
    return this.uniformes.listar(filtros);
  }

  async detalle(id: number) {
    const uniforme = await this.uniformes.detalle(id);
    if (!uniforme) throw new NotFoundException('Uniforme no encontrado');
    return uniforme;
  }

  async crear(usuario: UsuarioAutenticado, dto: CrearUniformeDto) {
    try {
      const creadoId = await this.baseDatos.transaccion(async (consultor) => {
        const creado = await this.uniformes.crear(dto, consultor);
        await this.auditoria.registrar(consultor, {
          modulo: 'M6',
          tabla: 'uniforme',
          registroId: creado.id,
          accion: 'CREAR',
          valorNuevo: creado,
          usuarioId: usuario.id,
        });
        if (dto.cantidadDisponible > 0) {
          await consultor.query(
            `INSERT INTO movimiento_inventario
             (uniforme_id, tipo, cantidad, observacion, registrado_por)
             VALUES ($1, 'ENTRADA', $2, 'Stock inicial', $3)`,
            [creado.id, dto.cantidadDisponible, usuario.id],
          );
        }
        return creado.id;
      });
      return this.uniformes.detalle(creadoId);
    } catch (error: unknown) {
      if (typeof error === 'object' && error !== null && 'code' in error) {
        if (error.code === '23505') throw new BadRequestException('La referencia o combinación ya existe');
      }
      throw error;
    }
  }

  async ajustar(id: number, usuario: UsuarioAutenticado, dto: AjustarStockDto) {
    await this.baseDatos.transaccion(async (consultor) => {
      try {
        const resultado = await this.uniformes.ajustar(
          id,
          dto.cantidad,
          usuario.id,
          dto.observacion ?? null,
          consultor,
        );
        if (!resultado) throw new NotFoundException('Uniforme activo no encontrado');
        await this.auditoria.registrar(consultor, {
          modulo: 'M6',
          tabla: 'uniforme',
          registroId: id,
          accion: 'AJUSTAR_STOCK',
          valorAnterior: { cantidadDisponible: resultado.cantidadDisponible - dto.cantidad },
          valorNuevo: { cantidadDisponible: resultado.cantidadDisponible },
          motivo: dto.observacion ?? null,
          usuarioId: usuario.id,
        });
        return this.uniformes.detalle(id);
      } catch (error: unknown) {
        if (error instanceof Error && error.message === 'STOCK_NEGATIVO') {
          throw new BadRequestException('El ajuste no puede dejar el stock negativo');
        }
        throw error;
      }
    });
    return this.uniformes.detalle(id);
  }

  async editar(id: number, usuario: UsuarioAutenticado, dto: EditarUniformeDto) {
    const anterior = await this.uniformes.detalle(id);
    if (!anterior) throw new NotFoundException('Uniforme no encontrado');
    try {
      await this.baseDatos.transaccion(async (consultor) => {
        const resultado = await this.uniformes.editar(id, dto, consultor);
        if (!resultado) throw new NotFoundException('Uniforme no encontrado');
        await this.auditoria.registrar(consultor, {
          modulo: 'M6',
          tabla: 'uniforme',
          registroId: id,
          accion: 'EDITAR',
          valorAnterior: anterior,
          valorNuevo: dto,
          usuarioId: usuario.id,
        });
      });
      return this.uniformes.detalle(id);
    } catch (error: unknown) {
      if (typeof error === 'object' && error !== null && 'code' in error && error.code === '23505') {
        throw new BadRequestException('La referencia o combinación ya existe');
      }
      throw error;
    }
  }

  async reactivar(id: number, usuario: UsuarioAutenticado) {
    await this.baseDatos.transaccion(async (consultor) => {
      const resultado = await this.uniformes.reactivar(id, consultor);
      if (!resultado) throw new NotFoundException('Uniforme inactivo no encontrado');
      await this.auditoria.registrar(consultor, {
        modulo: 'M6',
        tabla: 'uniforme',
        registroId: id,
        accion: 'REACTIVAR',
        valorAnterior: { activo: false },
        valorNuevo: { activo: true },
        usuarioId: usuario.id,
      });
    });
    return this.uniformes.detalle(id);
  }

  async desactivar(id: number, usuario: UsuarioAutenticado, motivo: string) {
    await this.baseDatos.transaccion(async (consultor) => {
      const resultado = await this.uniformes.desactivar(id, motivo, usuario.id, consultor);
      if (!resultado) throw new NotFoundException('Uniforme activo no encontrado');
      await this.auditoria.registrar(consultor, {
        modulo: 'M6',
        tabla: 'uniforme',
        registroId: id,
        accion: 'DESACTIVAR',
        valorAnterior: { activo: true },
        valorNuevo: { activo: false },
        motivo,
        usuarioId: usuario.id,
      });
    });
    return this.uniformes.detalle(id);
  }
}
