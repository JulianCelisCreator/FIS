import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditoriaRepository } from '../../../common/auditoria/auditoria.repository.js';
import type { UsuarioAutenticado } from '../../../common/auth/usuario-autenticado.js';
import { BaseDatosService } from '../../../common/database/base-datos.service.js';
import type { CrearPatinadorDto, EditarPatinadorDto } from '../dto/patinador.dto.js';
import { PerfilesPatinadorRepository } from '../repositories/perfiles-patinador.repository.js';

@Injectable()
export class PerfilesPatinadorService {
  constructor(
    private readonly baseDatos: BaseDatosService,
    private readonly perfiles: PerfilesPatinadorRepository,
    private readonly auditoria: AuditoriaRepository,
  ) {}

  listar() { return this.perfiles.listar(this.baseDatos.consultor); }

  async crear(dto: CrearPatinadorDto, usuario: UsuarioAutenticado) {
    this.validarFecha(dto.fechaNacimiento);
    try {
      return await this.baseDatos.transaccion(async (db) => {
        const perfil = await this.perfiles.crear(db, dto, usuario.id);
        await this.auditoria.registrar(db, {
          modulo: 'M2', tabla: 'patinador', registroId: perfil.id, accion: 'CREAR_PERFIL_PATINADOR',
          valorNuevo: perfil, usuarioId: usuario.id,
        });
        return perfil;
      });
    } catch (error) {
      if (this.esDuplicado(error)) throw new ConflictException('Ya existe un patinador con ese tipo y número de documento');
      throw error;
    }
  }

  async actualizar(id: number, dto: EditarPatinadorDto, usuario: UsuarioAutenticado) {
    if (dto.fechaNacimiento !== undefined) this.validarFecha(dto.fechaNacimiento);
    if (Object.keys(dto).length === 0) throw new BadRequestException('Indica al menos un cambio para guardar');
    try {
      return await this.baseDatos.transaccion(async (db) => {
        const anterior = await this.perfiles.buscar(db, id);
        if (!anterior) throw new NotFoundException('No se encontró el perfil activo del patinador');
        const actualizado = await this.perfiles.actualizar(db, id, dto);
        if (!actualizado) throw new NotFoundException('No se encontró el perfil activo del patinador');
        await this.auditoria.registrar(db, {
          modulo: 'M2', tabla: 'patinador', registroId: id, accion: 'ACTUALIZAR_PERFIL_PATINADOR',
          valorAnterior: anterior, valorNuevo: actualizado, usuarioId: usuario.id,
        });
        return actualizado;
      });
    } catch (error) {
      if (this.esDuplicado(error)) throw new ConflictException('Ya existe un patinador con ese tipo y número de documento');
      throw error;
    }
  }

  private validarFecha(fecha: string) {
    const partes = new Intl.DateTimeFormat('en', {
      timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit',
    }).formatToParts(new Date());
    const calendario = Object.fromEntries(partes.map((parte) => [parte.type, parte.value]));
    const hoy = `${calendario.year}-${calendario.month}-${calendario.day}`;
    if (fecha > hoy) {
      throw new BadRequestException('La fecha de nacimiento no puede ser futura');
    }
    if (fecha <= '1900-01-01') throw new BadRequestException('La fecha de nacimiento debe ser posterior al 1 de enero de 1900');
  }

  private esDuplicado(error: unknown): boolean {
    return typeof error === 'object' && error !== null && 'code' in error && error.code === '23505';
  }
}
