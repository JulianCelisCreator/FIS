import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditoriaRepository } from '../../../common/auditoria/auditoria.repository.js';
import type { UsuarioAutenticado } from '../../../common/auth/usuario-autenticado.js';
import { BaseDatosService } from '../../../common/database/base-datos.service.js';
import type { Consultor } from '../../../common/database/base-datos.service.js';
import type {
  CrearPersonalDto,
  EditarPersonalDto,
  FiltrosPersonalDto,
} from '../dto/personal.dto.js';
import { PersonalRepository, type Personal } from '../repositories/personal.repository.js';
import {
  ErrorReglaPersonal,
  mensajeDuplicado,
  normalizarPersonal,
  validarCuentaVinculable,
} from '../utils/reglas-personal.js';

/** Traduce los errores de reglas y de unicidad a la respuesta HTTP. */
export function traducirErrorPersonal(error: unknown): unknown {
  if (error instanceof ErrorReglaPersonal) {
    if (error.motivo === 'NO_ENCONTRADO') return new NotFoundException(error.message);
    if (error.motivo === 'DUPLICADO') return new ConflictException(error.message);
    return new BadRequestException(error.message);
  }
  const duplicado = mensajeDuplicado(error);
  return duplicado ? new ConflictException(duplicado) : error;
}

/** Registro y administración del personal (HU-6.2 / RF-M6-02). */
@Injectable()
export class PersonalService {
  constructor(
    private readonly personal: PersonalRepository,
    private readonly baseDatos: BaseDatosService,
    private readonly auditoria: AuditoriaRepository,
  ) {}

  listar(filtros: FiltrosPersonalDto) {
    return this.personal.listar(filtros);
  }

  cuentasDisponibles(buscar?: string) {
    return this.personal.cuentasDisponibles(buscar);
  }

  async detalle(id: number): Promise<Personal> {
    const persona = await this.personal.detalle(id);
    if (!persona) throw new NotFoundException('La persona no existe en el registro de personal');
    return persona;
  }

  async crear(usuario: UsuarioAutenticado, dto: CrearPersonalDto): Promise<Personal> {
    try {
      const id = await this.baseDatos.transaccion(async (consultor) => {
        const datos = normalizarPersonal(dto);
        if (datos.usuarioId) await this.validarCuenta(datos.usuarioId, null, consultor);
        const nuevoId = await this.personal.crear(datos, consultor);
        await this.auditoria.registrar(consultor, {
          modulo: 'M6',
          tabla: 'personal',
          registroId: nuevoId,
          accion: 'CREAR',
          valorNuevo: datos,
          usuarioId: usuario.id,
        });
        return nuevoId;
      });
      return this.detalle(id);
    } catch (error) {
      throw traducirErrorPersonal(error);
    }
  }

  async editar(id: number, usuario: UsuarioAutenticado, dto: EditarPersonalDto): Promise<Personal> {
    try {
      await this.baseDatos.transaccion(async (consultor) => {
        const anterior = await this.personal.detalle(id, consultor);
        if (!anterior) {
          throw new ErrorReglaPersonal('La persona no existe en el registro de personal', 'NO_ENCONTRADO');
        }
        const datos = normalizarPersonal(dto);
        if (datos.usuarioId) await this.validarCuenta(datos.usuarioId, id, consultor);
        await this.personal.editar(id, datos, consultor);
        await this.auditoria.registrar(consultor, {
          modulo: 'M6',
          tabla: 'personal',
          registroId: id,
          accion: 'ACTUALIZAR',
          valorAnterior: anterior,
          valorNuevo: datos,
          usuarioId: usuario.id,
        });
      });
      return this.detalle(id);
    } catch (error) {
      throw traducirErrorPersonal(error);
    }
  }

  desactivar(id: number, usuario: UsuarioAutenticado, motivo?: string) {
    return this.cambiarEstado(id, usuario, 'INACTIVO', motivo);
  }

  reactivar(id: number, usuario: UsuarioAutenticado) {
    return this.cambiarEstado(id, usuario, 'ACTIVO');
  }

  private async cambiarEstado(
    id: number,
    usuario: UsuarioAutenticado,
    estado: 'ACTIVO' | 'INACTIVO',
    motivo?: string,
  ): Promise<Personal> {
    try {
      await this.baseDatos.transaccion(async (consultor) => {
        const actual = await this.personal.bloquear(id, consultor);
        if (!actual) {
          throw new ErrorReglaPersonal('La persona no existe en el registro de personal', 'NO_ENCONTRADO');
        }
        if (actual.estado === estado) {
          throw new ErrorReglaPersonal(
            estado === 'INACTIVO' ? 'La persona ya está inactiva' : 'La persona ya está activa',
          );
        }
        await this.personal.cambiarEstado(id, estado, consultor);
        await this.auditoria.registrar(consultor, {
          modulo: 'M6',
          tabla: 'personal',
          registroId: id,
          accion: estado === 'INACTIVO' ? 'DESACTIVAR' : 'REACTIVAR',
          valorAnterior: { estado: actual.estado },
          valorNuevo: { estado },
          motivo: motivo?.trim() || null,
          usuarioId: usuario.id,
        });
      });
      return this.detalle(id);
    } catch (error) {
      throw traducirErrorPersonal(error);
    }
  }

  private async validarCuenta(usuarioId: number, personalId: number | null, consultor: Consultor) {
    validarCuentaVinculable(await this.personal.cuenta(usuarioId, consultor), personalId);
  }
}
