import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { UsuarioAutenticado } from '../../../common/auth/usuario-autenticado.js';
import { AuditoriaRepository } from '../../../common/auditoria/auditoria.repository.js';
import { BaseDatosService } from '../../../common/database/base-datos.service.js';
import type { CrearProveedorDto, FiltrosProveedoresDto } from '../dto/proveedores.dto.js';
import { ProveedoresRepository } from '../repositories/proveedores.repository.js';

@Injectable()
export class ProveedoresService {
  constructor(
    private readonly proveedores: ProveedoresRepository,
    private readonly baseDatos: BaseDatosService,
    private readonly auditoria: AuditoriaRepository,
  ) {}

  listar(filtros: FiltrosProveedoresDto) {
    return this.proveedores.listar(filtros);
  }

  async crear(usuario: UsuarioAutenticado, dto: CrearProveedorDto) {
    if (!dto.correo?.trim() && !dto.telefono?.trim()) {
      throw new BadRequestException('Registra al menos correo o teléfono.');
    }
    try {
      const id = await this.baseDatos.transaccion(async (consultor) => {
        const creado = await this.proveedores.crear(dto, consultor);
        await this.auditoria.registrar(consultor, {
          modulo: 'M6',
          tabla: 'proveedor',
          registroId: creado.id,
          accion: 'CREAR',
          valorNuevo: dto,
          usuarioId: usuario.id,
        });
        return creado.id;
      });
      return this.proveedores.detalle(id);
    } catch (error: unknown) {
      if (typeof error === 'object' && error !== null && 'code' in error && error.code === '23505') {
        throw new BadRequestException('Ya existe un proveedor con ese NIT o documento.');
      }
      throw error;
    }
  }

  async cambiarEstado(id: number, usuario: UsuarioAutenticado, activo: boolean) {
    const anterior = await this.proveedores.detalle(id);
    if (!anterior) throw new NotFoundException('Proveedor no encontrado');
    await this.baseDatos.transaccion(async (consultor) => {
      await this.proveedores.cambiarEstado(id, activo, consultor);
      await this.auditoria.registrar(consultor, {
        modulo: 'M6',
        tabla: 'proveedor',
        registroId: id,
        accion: activo ? 'REACTIVAR' : 'DESACTIVAR',
        valorAnterior: { activo: anterior.activo },
        valorNuevo: { activo },
        usuarioId: usuario.id,
      });
    });
    return this.proveedores.detalle(id);
  }
}
