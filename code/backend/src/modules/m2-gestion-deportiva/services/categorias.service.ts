import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditoriaRepository } from '../../../common/auditoria/auditoria.repository.js';
import { Rol, type UsuarioAutenticado } from '../../../common/auth/usuario-autenticado.js';
import { BaseDatosService } from '../../../common/database/base-datos.service.js';
import type { CrearCategoriaDto, EditarCategoriaDto } from '../dto/categorias.dto.js';
import { CategoriasRepository, type CategoriaClub } from '../repositories/categorias.repository.js';

@Injectable()
export class CategoriasService {
  constructor(
    private readonly baseDatos: BaseDatosService,
    private readonly categorias: CategoriasRepository,
    private readonly auditoria: AuditoriaRepository,
  ) {}

  /** Administrador: todas con conteo de patinadores. Profesor y acudiente: solo las activas, sin conteos. */
  async listar(usuario: UsuarioAutenticado) {
    const esAdmin = usuario.roles.includes(Rol.ADMINISTRADOR);
    const lista = await this.categorias.listar(this.baseDatos.consultor, !esAdmin);
    return esAdmin ? lista : lista.map(({ patinadoresAsignados: _omitido, ...publica }) => publica);
  }

  /**
   * Catálogo de categorías y niveles del club (RF-M2-17). El acudiente solo ve
   * categorías (RF-M2-19); el profesor y el administrador ven también los niveles.
   */
  async catalogo(usuario: UsuarioAutenticado) {
    const categorias = await this.listar(usuario);
    const veNiveles = usuario.roles.includes(Rol.ADMINISTRADOR) || usuario.roles.includes(Rol.PROFESOR);
    if (!veNiveles) return { categorias };
    return { categorias, niveles: await this.categorias.listarNivelesActivos(this.baseDatos.consultor) };
  }

  async crear(dto: CrearCategoriaDto, usuario: UsuarioAutenticado): Promise<CategoriaClub> {
    const edadMaxima = dto.edadMaxima ?? null;
    const nivelMinimoId = dto.nivelMinimoId ?? null;
    this.validarEdades(dto.edadMinima, edadMaxima);
    try {
      return await this.baseDatos.transaccion(async (db) => {
        if (nivelMinimoId !== null && !(await this.categorias.nivelActivoExiste(db, nivelMinimoId))) {
          throw new BadRequestException('El nivel mínimo debe ser un nivel activo del club');
        }
        const id = await this.categorias.crear(db, {
          nombre: dto.nombre, edadMinima: dto.edadMinima, edadMaxima, nivelMinimoId, genero: dto.genero ?? 'MIXTO',
        });
        const creada = (await this.categorias.buscar(db, id)) as CategoriaClub;
        await this.auditoria.registrar(db, {
          modulo: 'M2', tabla: 'categoria', registroId: id, accion: 'CREAR_CATEGORIA',
          valorNuevo: creada, usuarioId: usuario.id,
        });
        return creada;
      });
    } catch (error) {
      if (this.esDuplicado(error)) throw new ConflictException('Ya existe una categoría con ese nombre');
      throw error;
    }
  }

  async actualizar(id: number, dto: EditarCategoriaDto, usuario: UsuarioAutenticado): Promise<CategoriaClub> {
    // Los campos declarados de un DTO existen siempre (valen undefined si no se enviaron): se compara con undefined.
    if (Object.values(dto).every((valor) => valor === undefined)) throw new BadRequestException('Indica al menos un cambio para guardar');
    try {
      return await this.baseDatos.transaccion(async (db) => {
        const anterior = await this.categorias.buscar(db, id);
        if (!anterior) throw new NotFoundException('No se encontró la categoría solicitada');

        const edadMinima = dto.edadMinima ?? anterior.edadMinima;
        const edadMaxima = dto.edadMaxima !== undefined ? dto.edadMaxima : anterior.edadMaxima;
        const nivelMinimoId = dto.nivelMinimoId !== undefined ? dto.nivelMinimoId : (anterior.nivelMinimo?.id ?? null);
        const activo = dto.activo ?? anterior.activo;
        this.validarEdades(edadMinima, edadMaxima);

        if (nivelMinimoId !== null && nivelMinimoId !== anterior.nivelMinimo?.id
          && !(await this.categorias.nivelActivoExiste(db, nivelMinimoId))) {
          throw new BadRequestException('El nivel mínimo debe ser un nivel activo del club');
        }
        if (anterior.activo && !activo && anterior.patinadoresAsignados > 0) {
          throw new ConflictException(
            `No se puede inactivar: ${anterior.patinadoresAsignados} patinador(es) están en esta categoría. Cámbialos de categoría primero`,
          );
        }

        await this.categorias.actualizar(db, id, {
          nombre: dto.nombre ?? anterior.nombre, edadMinima, edadMaxima, nivelMinimoId,
          genero: dto.genero ?? anterior.genero, activo,
        });
        const actualizada = (await this.categorias.buscar(db, id)) as CategoriaClub;
        await this.auditoria.registrar(db, {
          modulo: 'M2', tabla: 'categoria', registroId: id, accion: 'ACTUALIZAR_CATEGORIA',
          valorAnterior: anterior, valorNuevo: actualizada, usuarioId: usuario.id,
        });
        return actualizada;
      });
    } catch (error) {
      if (this.esDuplicado(error)) throw new ConflictException('Ya existe una categoría con ese nombre');
      throw error;
    }
  }

  private validarEdades(minima: number, maxima: number | null) {
    if (maxima !== null && maxima < minima) {
      throw new BadRequestException('La edad máxima no puede ser menor que la edad mínima');
    }
  }

  private esDuplicado(error: unknown): boolean {
    return typeof error === 'object' && error !== null && 'code' in error && error.code === '23505';
  }
}
