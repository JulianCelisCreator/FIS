import { Injectable } from '@nestjs/common';
import type { Consultor } from '../../../common/database/base-datos.service.js';

export interface ResumenEntrenamiento {
  id: number;
  nombre: string;
  fechaNacimiento: string;
  genero: string;
  grupo: string | null;
  categoria: string | null;
  nivel: string | null;
  habilidadesAdquiridas: number;
  habilidadesPendientes: number;
}

const PARAMETRO_OBSERVACIONES = 'observaciones_visibles_patinador';

@Injectable()
export class SeguimientoRepository {
  // ── RF-M2-11 · información para entrenamiento ───────────────────────────

  async listarParaEntrenamiento(db: Consultor, usuarioId: number, administrador: boolean): Promise<ResumenEntrenamiento[]> {
    const { rows } = await db.query<ResumenEntrenamiento>(
      `${this.selectResumen()}
       WHERE p.activo AND ($2::boolean OR EXISTS (
         SELECT 1 FROM grupo_profesor gp
         WHERE gp.grupo_id = pg.grupo_id AND gp.desasignado_en IS NULL AND gp.profesor_id = $1))
       ORDER BY p.apellidos, p.nombres
       LIMIT 200`,
      [usuarioId, administrador],
    );
    return rows;
  }

  async buscarResumen(db: Consultor, patinadorId: number): Promise<ResumenEntrenamiento | null> {
    const { rows } = await db.query<ResumenEntrenamiento>(`${this.selectResumen()} WHERE p.id = $1 AND p.activo`, [patinadorId]);
    return rows[0] ?? null;
  }

  private selectResumen(): string {
    return `SELECT p.id, p.nombres || ' ' || p.apellidos AS nombre, p.fecha_nacimiento AS "fechaNacimiento", p.genero,
              g.nombre AS grupo, c.nombre AS categoria, n.nombre AS nivel,
              (SELECT count(*)::int FROM patinador_habilidad ph WHERE ph.patinador_id = p.id AND ph.estado = 'ADQUIRIDA') AS "habilidadesAdquiridas",
              (SELECT count(*)::int FROM patinador_habilidad ph WHERE ph.patinador_id = p.id AND ph.estado = 'PENDIENTE') AS "habilidadesPendientes"
       FROM patinador p
       LEFT JOIN patinador_grupo pg ON pg.patinador_id = p.id AND pg.hasta IS NULL
       LEFT JOIN grupo g ON g.id = pg.grupo_id
       LEFT JOIN patinador_categoria pc ON pc.patinador_id = p.id AND pc.hasta IS NULL
       LEFT JOIN categoria c ON c.id = pc.categoria_id
       LEFT JOIN patinador_nivel pn ON pn.patinador_id = p.id AND pn.hasta IS NULL
       LEFT JOIN nivel n ON n.id = pn.nivel_id`;
  }

  async ultimasEvaluaciones(db: Consultor, patinadorId: number, limite: number) {
    const { rows } = await db.query<{ id: number; fecha: string; nivel: string; resultado: string; observacion: string | null; profesor: string }>(
      `SELECT e.id, e.fecha, n.nombre AS nivel, e.resultado, e.observacion, u.nombres || ' ' || u.apellidos AS profesor
       FROM evaluacion_nivel e JOIN nivel n ON n.id = e.nivel_evaluado_id JOIN usuario u ON u.id = e.profesor_id
       WHERE e.patinador_id = $1 ORDER BY e.fecha DESC, e.id DESC LIMIT $2`,
      [patinadorId, limite],
    );
    return rows;
  }

  // ── RF-M2-12 · evaluación y nivel vigente ───────────────────────────────

  async nivelActivo(db: Consultor, nivelId: number): Promise<{ id: number; nombre: string; orden: number } | null> {
    const { rows } = await db.query<{ id: number; nombre: string; orden: number }>(
      'SELECT id, nombre, orden FROM nivel WHERE id = $1 AND activo', [nivelId],
    );
    return rows[0] ?? null;
  }

  async nivelVigente(db: Consultor, patinadorId: number): Promise<{ filaId: number; nivelId: number; orden: number } | null> {
    const { rows } = await db.query<{ filaId: number; nivelId: number; orden: number }>(
      `SELECT pn.id AS "filaId", pn.nivel_id AS "nivelId", n.orden
       FROM patinador_nivel pn JOIN nivel n ON n.id = pn.nivel_id
       WHERE pn.patinador_id = $1 AND pn.hasta IS NULL`,
      [patinadorId],
    );
    return rows[0] ?? null;
  }

  async crearEvaluacion(
    db: Consultor,
    datos: { patinadorId: number; profesorId: number; nivelId: number; resultado: string; observacion: string | null; fecha: string },
  ): Promise<number> {
    const { rows } = await db.query<{ id: number }>(
      `INSERT INTO evaluacion_nivel (patinador_id, profesor_id, nivel_evaluado_id, resultado, observacion, fecha)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [datos.patinadorId, datos.profesorId, datos.nivelId, datos.resultado, datos.observacion, datos.fecha],
    );
    return rows[0].id;
  }

  async cerrarNivel(db: Consultor, filaId: number, hasta: string): Promise<void> {
    await db.query('UPDATE patinador_nivel SET hasta = $2 WHERE id = $1', [filaId, hasta]);
  }

  async abrirNivel(db: Consultor, datos: { patinadorId: number; nivelId: number; desde: string; evaluacionId: number; usuarioId: number }): Promise<void> {
    await db.query(
      `INSERT INTO patinador_nivel (patinador_id, nivel_id, desde, evaluacion_id, asignado_por)
       VALUES ($1, $2, $3, $4, $5)`,
      [datos.patinadorId, datos.nivelId, datos.desde, datos.evaluacionId, datos.usuarioId],
    );
  }

  // ── RF-M2-13 · habilidades ──────────────────────────────────────────────

  async listarHabilidades(db: Consultor, patinadorId: number) {
    const { rows } = await db.query<{
      habilidadId: number; nombre: string; descripcion: string | null; nivelId: number; nivel: string; nivelOrden: number; estado: string | null;
    }>(
      `SELECT h.id AS "habilidadId", h.nombre, h.descripcion, n.id AS "nivelId", n.nombre AS nivel, n.orden AS "nivelOrden", ph.estado
       FROM habilidad h
       JOIN nivel n ON n.id = h.nivel_id
       LEFT JOIN patinador_habilidad ph ON ph.habilidad_id = h.id AND ph.patinador_id = $1
       WHERE h.activo AND n.activo
       ORDER BY n.orden, h.orden, h.nombre`,
      [patinadorId],
    );
    return rows;
  }

  async contarHabilidadesActivas(db: Consultor, ids: number[]): Promise<number> {
    const { rows } = await db.query<{ total: number }>(
      'SELECT count(*)::int AS total FROM habilidad WHERE id = ANY($1::bigint[]) AND activo', [ids],
    );
    return rows[0].total;
  }

  async marcarHabilidad(db: Consultor, datos: { patinadorId: number; habilidadId: number; estado: string; usuarioId: number }): Promise<void> {
    await db.query(
      `INSERT INTO patinador_habilidad (patinador_id, habilidad_id, estado, actualizado_por)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (patinador_id, habilidad_id)
       DO UPDATE SET estado = EXCLUDED.estado, actualizado_por = EXCLUDED.actualizado_por, actualizado_en = now()`,
      [datos.patinadorId, datos.habilidadId, datos.estado, datos.usuarioId],
    );
  }

  // ── RF-M2-14 y RF-M2-23 · observaciones ─────────────────────────────────

  async crearObservacion(db: Consultor, datos: { patinadorId: number; profesorId: number; texto: string; visible: boolean; fecha: string }) {
    const { rows } = await db.query<{ id: number; fecha: string; texto: string; visible: boolean }>(
      `INSERT INTO observacion_desempeno (patinador_id, profesor_id, texto, visible_para_patinador, fecha)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, fecha, texto, visible_para_patinador AS visible`,
      [datos.patinadorId, datos.profesorId, datos.texto, datos.visible, datos.fecha],
    );
    return rows[0];
  }

  async listarObservaciones(db: Consultor, patinadorId: number, soloVisibles: boolean) {
    const { rows } = await db.query<{ id: number; fecha: string; texto: string; visibleParaPatinador: boolean; profesor: string }>(
      `SELECT o.id, o.fecha, o.texto, o.visible_para_patinador AS "visibleParaPatinador",
              u.nombres || ' ' || u.apellidos AS profesor
       FROM observacion_desempeno o JOIN usuario u ON u.id = o.profesor_id
       WHERE o.patinador_id = $1 AND (NOT $2::boolean OR o.visible_para_patinador)
       ORDER BY o.fecha DESC, o.id DESC LIMIT 200`,
      [patinadorId, soloVisibles],
    );
    return rows;
  }

  async observacionesHabilitadas(db: Consultor): Promise<boolean> {
    const { rows } = await db.query<{ valor: string }>('SELECT valor FROM parametro_sistema WHERE clave = $1', [PARAMETRO_OBSERVACIONES]);
    return rows[0]?.valor === 'true';
  }

  async fijarObservacionesHabilitadas(db: Consultor, habilitada: boolean): Promise<void> {
    await db.query(
      `INSERT INTO parametro_sistema (clave, valor, descripcion)
       VALUES ($1, $2, 'M2-23: si el club permite al patinador ver las observaciones')
       ON CONFLICT (clave) DO UPDATE SET valor = EXCLUDED.valor, actualizado_en = now()`,
      [PARAMETRO_OBSERVACIONES, String(habilitada)],
    );
  }

  /** El patinador con cuenta propia, a partir de su usuario. */
  async patinadorDelUsuario(db: Consultor, usuarioId: number): Promise<number | null> {
    const { rows } = await db.query<{ id: number }>('SELECT id FROM patinador WHERE usuario_id = $1 AND activo', [usuarioId]);
    return rows[0]?.id ?? null;
  }
}
