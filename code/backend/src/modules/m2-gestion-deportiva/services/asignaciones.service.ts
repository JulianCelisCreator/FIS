import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditoriaRepository } from '../../../common/auditoria/auditoria.repository.js';
import { Rol, type UsuarioAutenticado } from '../../../common/auth/usuario-autenticado.js';
import { BaseDatosService, type Consultor } from '../../../common/database/base-datos.service.js';
import { hoyEnClub } from '../../../common/utils/fecha-club.js';
import type { AsignarCategoriaDto, ProponerCambioCategoriaDto, RechazarPropuestaDto } from '../dto/asignaciones.dto.js';
import {
  AsignacionesRepository,
  type CategoriaActual,
  type CategoriaConId,
  type PatinadorParaCategoria,
} from '../repositories/asignaciones.repository.js';
import { motivosNoElegible } from '../utils/reglas-categoria.js';
import { AlcanceService } from './alcance.service.js';
import { PermisoM2Seguimiento } from '../enums/permiso-m2-seguimiento.enum.js';

@Injectable()
export class AsignacionesService {
  constructor(
    private readonly baseDatos: BaseDatosService,
    private readonly asignaciones: AsignacionesRepository,
    private readonly alcance: AlcanceService,
    private readonly auditoria: AuditoriaRepository,
  ) {}

  listarPatinadores(buscar?: string) {
    return this.asignaciones.listarParaAsignar(this.baseDatos.consultor, buscar?.trim() || null);
  }

  /** RF-M2-08: primera asignación de un patinador a una categoría, validando su nivel. */
  async asignar(patinadorId: number, dto: AsignarCategoriaDto, usuario: UsuarioAutenticado) {
    return this.baseDatos.transaccion(async (db) => {
      const { patinador, categoria, actual } = await this.cargar(db, patinadorId, dto.categoriaId);
      if (actual) {
        throw new ConflictException(`El patinador ya está en la categoría ${actual.categoria}; usa el cambio de categoría`);
      }
      this.exigirElegible(categoria, patinador);
      const hoy = hoyEnClub();
      const filaId = await this.asignaciones.abrirCategoria(db, {
        patinadorId, categoriaId: categoria.id, desde: hoy, motivo: dto.motivo?.trim() || null, propuestaId: null, asignadoPor: usuario.id,
      });
      await this.auditoria.registrar(db, {
        modulo: 'M2', tabla: 'patinador_categoria', registroId: filaId, accion: 'ASIGNAR_CATEGORIA',
        valorNuevo: { patinadorId, categoriaId: categoria.id, categoria: categoria.nombre, desde: hoy },
        motivo: dto.motivo?.trim() || null, usuarioId: usuario.id,
      });
      return { patinadorId, categoriaId: categoria.id, categoria: categoria.nombre, desde: hoy };
    });
  }

  /** RF-M2-09: el administrador cambia la categoría tras un avance de nivel aprobado. */
  async cambiar(patinadorId: number, dto: AsignarCategoriaDto, usuario: UsuarioAutenticado) {
    return this.baseDatos.transaccion(async (db) => {
      const { patinador, categoria, actual } = await this.cargar(db, patinadorId, dto.categoriaId);
      const vigente = this.exigirCategoriaVigente(actual);
      await this.validarPromocion(db, patinador, categoria, vigente);
      return this.aplicarCambio(db, {
        patinador, categoria, vigente, motivo: dto.motivo?.trim() || null, propuestaId: null, usuario, accion: 'CAMBIAR_CATEGORIA',
      });
    });
  }

  /**
   * RF-M2-16: el profesor propone el cambio; si el administrador le concedió
   * M2_CATEGORIA_PROMOVER_DIRECTO, el cambio se ejecuta de una vez.
   */
  async proponer(dto: ProponerCambioCategoriaDto, usuario: UsuarioAutenticado) {
    const directo = usuario.permisos.includes(PermisoM2Seguimiento.CATEGORIA_PROMOVER_DIRECTO);
    return this.baseDatos.transaccion(async (db) => {
      await this.alcance.exigirAccesoComoProfesor(db, usuario, dto.patinadorId);
      const { patinador, categoria, actual } = await this.cargar(db, dto.patinadorId, dto.categoriaId);
      const vigente = this.exigirCategoriaVigente(actual);
      await this.validarPromocion(db, patinador, categoria, vigente);
      if (await this.asignaciones.hayPropuestaPendiente(db, patinador.id)) {
        throw new ConflictException('Ya hay una propuesta de cambio pendiente para este patinador');
      }
      const hoy = hoyEnClub();
      const propuestaId = await this.asignaciones.crearPropuesta(db, {
        patinadorId: patinador.id, actualId: vigente.categoriaId, propuestaId: categoria.id,
        justificacion: dto.justificacion, propuestaPor: usuario.id,
        estado: directo ? 'APROBADA' : 'PROPUESTA', fechaEfectiva: directo ? hoy : null,
      });
      await this.auditoria.registrar(db, {
        modulo: 'M2', tabla: 'propuesta_cambio_categoria', registroId: propuestaId,
        accion: directo ? 'PROMOVER_CATEGORIA_DIRECTO' : 'PROPONER_CAMBIO_CATEGORIA',
        valorNuevo: { patinadorId: patinador.id, de: vigente.categoria, a: categoria.nombre },
        motivo: dto.justificacion, usuarioId: usuario.id,
      });
      if (!directo) return { modo: 'PROPUESTA' as const, propuestaId, patinadorId: patinador.id, categoria: categoria.nombre };
      const cambio = await this.aplicarCambio(db, {
        patinador, categoria, vigente, motivo: dto.justificacion, propuestaId, usuario, accion: 'CAMBIAR_CATEGORIA',
      });
      return { modo: 'EJECUTADO' as const, propuestaId, ...cambio };
    });
  }

  /** El administrador ve todas; el profesor solo las que él propuso. */
  listarPropuestas(usuario: UsuarioAutenticado, estado?: string) {
    const estadoValido = ['PROPUESTA', 'APROBADA', 'RECHAZADA'].includes(estado ?? '') ? (estado as string) : null;
    return this.asignaciones.listarPropuestas(this.baseDatos.consultor, {
      estado: estadoValido,
      proponenteId: usuario.roles.includes(Rol.ADMINISTRADOR) ? null : usuario.id,
    });
  }

  async aprobar(propuestaId: number, usuario: UsuarioAutenticado) {
    return this.baseDatos.transaccion(async (db) => {
      const propuesta = await this.asignaciones.bloquearPropuesta(db, propuestaId);
      if (!propuesta) throw new NotFoundException('No se encontró la propuesta solicitada');
      if (propuesta.estado !== 'PROPUESTA') throw new ConflictException('La propuesta ya fue resuelta');

      const { patinador, categoria, actual } = await this.cargar(db, propuesta.patinadorId, propuesta.categoriaPropuestaId);
      const vigente = this.exigirCategoriaVigente(actual);
      if (vigente.categoriaId !== propuesta.categoriaActualId) {
        throw new ConflictException('La categoría del patinador cambió después de la propuesta; vuelve a proponerla');
      }
      await this.validarPromocion(db, patinador, categoria, vigente);

      const hoy = hoyEnClub();
      await this.asignaciones.resolverPropuesta(db, propuestaId, 'APROBADA', usuario.id, hoy);
      const cambio = await this.aplicarCambio(db, {
        patinador, categoria, vigente, motivo: propuesta.justificacion, propuestaId, usuario, accion: 'CAMBIAR_CATEGORIA',
      });
      await this.auditoria.registrar(db, {
        modulo: 'M2', tabla: 'propuesta_cambio_categoria', registroId: propuestaId, accion: 'APROBAR_PROPUESTA_CATEGORIA',
        valorNuevo: cambio, usuarioId: usuario.id,
      });
      return { propuestaId, ...cambio };
    });
  }

  async rechazar(propuestaId: number, dto: RechazarPropuestaDto, usuario: UsuarioAutenticado) {
    return this.baseDatos.transaccion(async (db) => {
      const propuesta = await this.asignaciones.bloquearPropuesta(db, propuestaId);
      if (!propuesta) throw new NotFoundException('No se encontró la propuesta solicitada');
      if (propuesta.estado !== 'PROPUESTA') throw new ConflictException('La propuesta ya fue resuelta');
      await this.asignaciones.resolverPropuesta(db, propuestaId, 'RECHAZADA', usuario.id, null);
      await this.auditoria.registrar(db, {
        modulo: 'M2', tabla: 'propuesta_cambio_categoria', registroId: propuestaId, accion: 'RECHAZAR_PROPUESTA_CATEGORIA',
        motivo: dto.motivo?.trim() || null, usuarioId: usuario.id,
      });
      return { propuestaId, estado: 'RECHAZADA' as const };
    });
  }

  // ── Apoyos ──────────────────────────────────────────────────────────────

  private async cargar(db: Consultor, patinadorId: number, categoriaId: number) {
    const patinador = await this.asignaciones.bloquearPatinador(db, patinadorId);
    if (!patinador) throw new NotFoundException('No se encontró el perfil activo del patinador');
    const categoria = await this.asignaciones.buscarCategoria(db, categoriaId);
    if (!categoria) throw new NotFoundException('No se encontró la categoría solicitada');
    if (!categoria.activo) throw new BadRequestException(`La categoría ${categoria.nombre} está inactiva`);
    const actual = await this.asignaciones.categoriaActual(db, patinadorId);
    return { patinador, categoria, actual };
  }

  private exigirCategoriaVigente(actual: CategoriaActual | null): CategoriaActual {
    if (!actual) {
      throw new ConflictException('El patinador aún no tiene categoría; el administrador debe hacer la asignación inicial');
    }
    return actual;
  }

  private exigirElegible(categoria: CategoriaConId, patinador: PatinadorParaCategoria) {
    const motivos = motivosNoElegible(categoria, patinador, hoyEnClub());
    if (motivos.length > 0) throw new BadRequestException(motivos.join('. '));
  }

  /** Cambio de categoría: otra categoría, elegible y con un avance de nivel aprobado desde que entró a la actual. */
  private async validarPromocion(db: Consultor, patinador: PatinadorParaCategoria, categoria: CategoriaConId, vigente: CategoriaActual) {
    if (vigente.categoriaId === categoria.id) {
      throw new ConflictException(`El patinador ya está en la categoría ${categoria.nombre}`);
    }
    this.exigirElegible(categoria, patinador);
    if (!(await this.asignaciones.hayAvanceAprobado(db, patinador.id, vigente.desde))) {
      throw new BadRequestException(
        `El patinador no tiene un avance de nivel aprobado desde que entró a ${vigente.categoria}; registra una evaluación aprobada primero`,
      );
    }
  }

  private async aplicarCambio(
    db: Consultor,
    datos: {
      patinador: PatinadorParaCategoria; categoria: CategoriaConId; vigente: CategoriaActual;
      motivo: string | null; propuestaId: number | null; usuario: UsuarioAutenticado; accion: string;
    },
  ) {
    const hoy = hoyEnClub();
    await this.asignaciones.cerrarCategoria(db, datos.vigente.filaId, hoy);
    const filaId = await this.asignaciones.abrirCategoria(db, {
      patinadorId: datos.patinador.id, categoriaId: datos.categoria.id, desde: hoy,
      motivo: datos.motivo, propuestaId: datos.propuestaId, asignadoPor: datos.usuario.id,
    });
    const resultado = {
      patinadorId: datos.patinador.id,
      categoriaAnterior: datos.vigente.categoria,
      categoria: datos.categoria.nombre,
      categoriaId: datos.categoria.id,
      desde: hoy,
    };
    await this.auditoria.registrar(db, {
      modulo: 'M2', tabla: 'patinador_categoria', registroId: filaId, accion: datos.accion,
      valorAnterior: { categoriaId: datos.vigente.categoriaId, categoria: datos.vigente.categoria },
      valorNuevo: resultado, motivo: datos.motivo, usuarioId: datos.usuario.id,
    });
    return resultado;
  }
}
