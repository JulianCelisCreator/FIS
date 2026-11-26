import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditoriaRepository } from '../../../common/auditoria/auditoria.repository.js';
import type { UsuarioAutenticado } from '../../../common/auth/usuario-autenticado.js';
import { BaseDatosService } from '../../../common/database/base-datos.service.js';
import { hoyEnClub } from '../../../common/utils/fecha-club.js';
import type {
  CrearEvaluacionDto, CrearObservacionDto, HabilitarObservacionesDto, RegistrarHabilidadesDto,
} from '../dto/seguimiento.dto.js';
import { SeguimientoRepository } from '../repositories/seguimiento.repository.js';
import { AlcanceService } from './alcance.service.js';

@Injectable()
export class SeguimientoService {
  constructor(
    private readonly baseDatos: BaseDatosService,
    private readonly seguimiento: SeguimientoRepository,
    private readonly alcance: AlcanceService,
    private readonly auditoria: AuditoriaRepository,
  ) {}

  // ── RF-M2-11 ────────────────────────────────────────────────────────────

  listarParaEntrenamiento(usuario: UsuarioAutenticado) {
    return this.seguimiento.listarParaEntrenamiento(this.baseDatos.consultor, usuario.id, this.alcance.esAdministrador(usuario));
  }

  /** Ficha técnica y de perfil útil para la práctica; no incluye documento ni teléfono. */
  async ficha(patinadorId: number, usuario: UsuarioAutenticado) {
    const db = this.baseDatos.consultor;
    await this.alcance.exigirAccesoComoProfesor(db, usuario, patinadorId);
    const resumen = await this.seguimiento.buscarResumen(db, patinadorId);
    if (!resumen) throw new NotFoundException('No se encontró el perfil activo del patinador');
    const [habilidades, evaluaciones, observaciones] = await Promise.all([
      this.seguimiento.listarHabilidades(db, patinadorId),
      this.seguimiento.ultimasEvaluaciones(db, patinadorId, 5),
      this.seguimiento.listarObservaciones(db, patinadorId, false),
    ]);
    return { ...resumen, habilidades: habilidades.filter((h) => h.estado !== null), evaluaciones, observaciones: observaciones.slice(0, 5) };
  }

  // ── RF-M2-12 ────────────────────────────────────────────────────────────

  /**
   * Guarda la evaluación. Si resulta APROBADA y el nivel evaluado es superior al
   * vigente (o el patinador no tenía nivel), ese pasa a ser su nivel actual y el
   * anterior queda en el historial (decisión pendiente de confirmar con el club).
   */
  async evaluar(patinadorId: number, dto: CrearEvaluacionDto, usuario: UsuarioAutenticado) {
    return this.baseDatos.transaccion(async (db) => {
      await this.alcance.exigirAccesoComoProfesor(db, usuario, patinadorId);
      const { rows } = await db.query<{ id: number }>('SELECT id FROM patinador WHERE id = $1 AND activo FOR UPDATE', [patinadorId]);
      if (rows.length === 0) throw new NotFoundException('No se encontró el perfil activo del patinador');
      const nivel = await this.seguimiento.nivelActivo(db, dto.nivelEvaluadoId);
      if (!nivel) throw new BadRequestException('El nivel a evaluar debe ser un nivel activo del club');

      const hoy = hoyEnClub();
      const evaluacionId = await this.seguimiento.crearEvaluacion(db, {
        patinadorId, profesorId: usuario.id, nivelId: nivel.id, resultado: dto.resultado,
        observacion: dto.observacion?.trim() || null, fecha: hoy,
      });

      let nivelActualizado = false;
      if (dto.resultado === 'APROBADO') {
        const vigente = await this.seguimiento.nivelVigente(db, patinadorId);
        if (!vigente || nivel.orden > vigente.orden) {
          if (vigente) await this.seguimiento.cerrarNivel(db, vigente.filaId, hoy);
          await this.seguimiento.abrirNivel(db, { patinadorId, nivelId: nivel.id, desde: hoy, evaluacionId, usuarioId: usuario.id });
          nivelActualizado = true;
        }
      }
      await this.auditoria.registrar(db, {
        modulo: 'M2', tabla: 'evaluacion_nivel', registroId: evaluacionId, accion: 'EVALUAR_NIVEL',
        valorNuevo: { patinadorId, nivel: nivel.nombre, resultado: dto.resultado, nivelActualizado }, usuarioId: usuario.id,
      });
      return { evaluacionId, patinadorId, nivel: nivel.nombre, resultado: dto.resultado, fecha: hoy, nivelActualizado };
    });
  }

  // ── RF-M2-13 ────────────────────────────────────────────────────────────

  async habilidades(patinadorId: number, usuario: UsuarioAutenticado) {
    const db = this.baseDatos.consultor;
    await this.alcance.exigirAccesoComoProfesor(db, usuario, patinadorId);
    return this.seguimiento.listarHabilidades(db, patinadorId);
  }

  async registrarHabilidades(patinadorId: number, dto: RegistrarHabilidadesDto, usuario: UsuarioAutenticado) {
    const ids = [...new Set(dto.habilidades.map((h) => h.habilidadId))];
    if (ids.length !== dto.habilidades.length) throw new BadRequestException('Una habilidad no puede repetirse en la misma solicitud');
    return this.baseDatos.transaccion(async (db) => {
      await this.alcance.exigirAccesoComoProfesor(db, usuario, patinadorId);
      const { rows } = await db.query<{ id: number }>('SELECT id FROM patinador WHERE id = $1 AND activo FOR UPDATE', [patinadorId]);
      if (rows.length === 0) throw new NotFoundException('No se encontró el perfil activo del patinador');
      if (await this.seguimiento.contarHabilidadesActivas(db, ids) !== ids.length) {
        throw new BadRequestException('Alguna habilidad no existe o está inactiva');
      }
      for (const marca of dto.habilidades) {
        await this.seguimiento.marcarHabilidad(db, { patinadorId, habilidadId: marca.habilidadId, estado: marca.estado, usuarioId: usuario.id });
      }
      await this.auditoria.registrar(db, {
        modulo: 'M2', tabla: 'patinador_habilidad', registroId: patinadorId, accion: 'REGISTRAR_HABILIDADES',
        valorNuevo: dto.habilidades, usuarioId: usuario.id,
      });
      return this.seguimiento.listarHabilidades(db, patinadorId);
    });
  }

  // ── RF-M2-14 ────────────────────────────────────────────────────────────

  async crearObservacion(patinadorId: number, dto: CrearObservacionDto, usuario: UsuarioAutenticado) {
    return this.baseDatos.transaccion(async (db) => {
      await this.alcance.exigirAccesoComoProfesor(db, usuario, patinadorId);
      const { rows } = await db.query<{ id: number }>('SELECT id FROM patinador WHERE id = $1 AND activo', [patinadorId]);
      if (rows.length === 0) throw new NotFoundException('No se encontró el perfil activo del patinador');
      const observacion = await this.seguimiento.crearObservacion(db, {
        patinadorId, profesorId: usuario.id, texto: dto.texto, visible: dto.visibleParaPatinador ?? false, fecha: hoyEnClub(),
      });
      await this.auditoria.registrar(db, {
        modulo: 'M2', tabla: 'observacion_desempeno', registroId: observacion.id, accion: 'CREAR_OBSERVACION',
        valorNuevo: { patinadorId, visible: observacion.visible }, usuarioId: usuario.id,
      });
      return observacion;
    });
  }

  async listarObservaciones(patinadorId: number, usuario: UsuarioAutenticado) {
    const db = this.baseDatos.consultor;
    await this.alcance.exigirAccesoComoProfesor(db, usuario, patinadorId);
    return this.seguimiento.listarObservaciones(db, patinadorId, false);
  }

  // ── RF-M2-23 ────────────────────────────────────────────────────────────

  /** El patinador ve solo las observaciones marcadas como visibles, y solo si el club habilitó la consulta. */
  async observacionesPropias(usuario: UsuarioAutenticado) {
    const db = this.baseDatos.consultor;
    if (!(await this.seguimiento.observacionesHabilitadas(db))) {
      throw new ForbiddenException('El club aún no habilitó la consulta de observaciones');
    }
    const patinadorId = await this.seguimiento.patinadorDelUsuario(db, usuario.id);
    if (patinadorId === null) throw new NotFoundException('Tu cuenta no tiene un perfil de patinador asociado');
    return this.seguimiento.listarObservaciones(db, patinadorId, true);
  }

  async estadoObservaciones() {
    return { habilitada: await this.seguimiento.observacionesHabilitadas(this.baseDatos.consultor) };
  }

  async habilitarObservaciones(dto: HabilitarObservacionesDto, usuario: UsuarioAutenticado) {
    return this.baseDatos.transaccion(async (db) => {
      const anterior = await this.seguimiento.observacionesHabilitadas(db);
      if (anterior === dto.habilitada) throw new ConflictException(`La consulta ya está ${anterior ? 'habilitada' : 'deshabilitada'}`);
      await this.seguimiento.fijarObservacionesHabilitadas(db, dto.habilitada);
      await this.auditoria.registrar(db, {
        modulo: 'M2', tabla: 'parametro_sistema', registroId: 0, accion: 'HABILITAR_OBSERVACIONES',
        valorAnterior: { habilitada: anterior }, valorNuevo: { habilitada: dto.habilitada }, usuarioId: usuario.id,
      });
      return { habilitada: dto.habilitada };
    });
  }
}
