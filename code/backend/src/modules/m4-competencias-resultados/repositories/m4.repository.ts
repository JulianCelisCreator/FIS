import { Injectable } from '@nestjs/common';
import type { Consultor } from '../../../common/database/base-datos.service.js';

/** Acceso SQL del M4. Se usan las tablas y vistas ya definidas en db/schema.sql. */
@Injectable()
export class M4Repository {
  async listarCompetencias(db: Consultor, filtros: { estado?: string; buscar?: string }, estadosVisibles?: string[]) {
    const { rows } = await db.query(
      `SELECT c.id, c.nombre, c.fecha_hora AS "fechaHora", c.lugar, c.tipo, c.estado,
              c.apertura_inscripciones AS "aperturaInscripciones", c.cierre_inscripciones AS "cierreInscripciones",
              (SELECT count(*)::int FROM prueba p WHERE p.competencia_id=c.id) AS "totalPruebas",
              (SELECT count(*)::int FROM inscripcion i JOIN prueba p ON p.id=i.prueba_id
                WHERE p.competencia_id=c.id AND i.estado='APROBADA') AS "inscripcionesAprobadas"
       FROM competencia c
       WHERE ($1::text IS NULL OR c.estado=$1)
         AND ($2::text IS NULL OR c.nombre ILIKE '%' || $2 || '%')
         AND ($3::text[] IS NULL OR c.estado=ANY($3))
       ORDER BY c.fecha_hora DESC, c.id DESC`,
      [filtros.estado || null, filtros.buscar?.trim() || null, estadosVisibles ?? null],
    );
    return rows;
  }

  async competencia(db: Consultor, id: number, bloquear = false) {
    const { rows } = await db.query(
      `SELECT id, nombre, fecha_hora AS "fechaHora", lugar, tipo, estado,
              apertura_inscripciones AS "aperturaInscripciones", cierre_inscripciones AS "cierreInscripciones"
       FROM competencia WHERE id=$1 ${bloquear ? 'FOR UPDATE' : ''}`, [id],
    );
    return rows[0] ?? null;
  }

  async pruebas(db: Consultor, competenciaId: number) {
    const { rows } = await db.query(
      `SELECT p.id, p.competencia_id AS "competenciaId", p.modalidad,
              p.distancia_metros AS "distanciaMetros", p.descripcion,
              COALESCE(json_agg(json_build_object('categoriaId', pc.categoria_id,
                'categoria', ca.nombre, 'genero', pc.genero)) FILTER (WHERE pc.categoria_id IS NOT NULL), '[]') AS categorias
       FROM prueba p LEFT JOIN prueba_categoria pc ON pc.prueba_id=p.id
       LEFT JOIN categoria ca ON ca.id=pc.categoria_id
       WHERE p.competencia_id=$1 GROUP BY p.id ORDER BY p.distancia_metros, p.modalidad`, [competenciaId],
    );
    return rows;
  }

  async categorias(db: Consultor) {
    const { rows } = await db.query(
      `SELECT id, nombre, genero FROM categoria WHERE activo=true ORDER BY edad_minima, nombre`,
    );
    return rows;
  }

  async crearCompetencia(db: Consultor, x: any, usuarioId: number) {
    const { rows } = await db.query(
      `INSERT INTO competencia (nombre,fecha_hora,lugar,tipo,apertura_inscripciones,cierre_inscripciones,creado_por)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
      [x.nombre.trim(), x.fechaHora, x.lugar.trim(), x.tipo, x.aperturaInscripciones, x.cierreInscripciones, usuarioId],
    );
    return rows[0].id as number;
  }

  async actualizarCompetencia(db: Consultor, id: number, x: any) {
    await db.query(
      `UPDATE competencia SET nombre=COALESCE($2,nombre), fecha_hora=COALESCE($3,fecha_hora),
       lugar=COALESCE($4,lugar), tipo=COALESCE($5,tipo),
       apertura_inscripciones=COALESCE($6,apertura_inscripciones),
       cierre_inscripciones=COALESCE($7,cierre_inscripciones), actualizado_en=now() WHERE id=$1`,
      [id,x.nombre?.trim() ?? null,x.fechaHora ?? null,x.lugar?.trim() ?? null,x.tipo ?? null,
       x.aperturaInscripciones ?? null,x.cierreInscripciones ?? null],
    );
  }

  async elegibles(db: Consultor, usuarioId: number, competenciaId: number, admin: boolean) {
    const { rows } = await db.query(
      `SELECT DISTINCT pt.id, pt.nombres || ' ' || pt.apellidos AS nombre,
        date_part('year',age(current_date,pt.fecha_nacimiento))::int AS edad,
        COALESCE(ca.nombre,'Sin categoría') AS categoria,
        EXISTS(SELECT 1 FROM preseleccion ps WHERE ps.competencia_id=$2 AND ps.patinador_id=pt.id) AS preseleccionado
       FROM patinador pt
       JOIN patinador_grupo pg ON pg.patinador_id=pt.id AND pg.hasta IS NULL
       JOIN grupo g ON g.id=pg.grupo_id AND g.activo=true
       LEFT JOIN patinador_categoria pca ON pca.patinador_id=pt.id AND pca.hasta IS NULL
       LEFT JOIN categoria ca ON ca.id=pca.categoria_id
       WHERE pt.activo=true AND ($3::boolean OR EXISTS(
         SELECT 1 FROM grupo_profesor gp WHERE gp.grupo_id=g.id AND gp.profesor_id=$1 AND gp.desasignado_en IS NULL))
       ORDER BY nombre`, [usuarioId, competenciaId, admin],
    );
    return rows;
  }


  async elegiblesPropios(db: Consultor, usuarioId: number, competenciaId: number, acudiente: boolean) {
    const { rows } = await db.query(
      acudiente
        ? `SELECT pt.id, pt.nombres || ' ' || pt.apellidos AS nombre,
             date_part('year',age(current_date,pt.fecha_nacimiento))::int AS edad,
             COALESCE(ca.nombre,'Sin categoría') AS categoria, true AS preseleccionado
           FROM acudiente_patinador aa JOIN patinador pt ON pt.id=aa.patinador_id
           JOIN preseleccion ps ON ps.patinador_id=pt.id AND ps.competencia_id=$2
           LEFT JOIN patinador_categoria pc ON pc.patinador_id=pt.id AND pc.hasta IS NULL
           LEFT JOIN categoria ca ON ca.id=pc.categoria_id
           WHERE aa.acudiente_id=$1 AND aa.desvinculado_en IS NULL AND pt.activo=true`
        : `SELECT pt.id, pt.nombres || ' ' || pt.apellidos AS nombre,
             date_part('year',age(current_date,pt.fecha_nacimiento))::int AS edad,
             COALESCE(ca.nombre,'Sin categoría') AS categoria, true AS preseleccionado
           FROM patinador pt JOIN preseleccion ps ON ps.patinador_id=pt.id AND ps.competencia_id=$2
           LEFT JOIN patinador_categoria pc ON pc.patinador_id=pt.id AND pc.hasta IS NULL
           LEFT JOIN categoria ca ON ca.id=pc.categoria_id
           WHERE pt.usuario_id=$1 AND pt.activo=true`,
      [usuarioId,competenciaId],
    );
    return rows;
  }

  async preseleccionar(db: Consultor, competenciaId: number, patinadorId: number, profesorId: number) {
    await db.query(
      `INSERT INTO preseleccion (competencia_id,patinador_id,profesor_id)
       VALUES ($1,$2,$3) ON CONFLICT (competencia_id,patinador_id) DO NOTHING`,
      [competenciaId,patinadorId,profesorId],
    );
  }


  async esElegiblePrueba(db: Consultor, pruebaId: number, patinadorId: number) {
    const { rows } = await db.query(
      `SELECT EXISTS(
        SELECT 1 FROM prueba_categoria pc
        JOIN patinador_categoria pca ON pca.categoria_id=pc.categoria_id
          AND pca.patinador_id=$2 AND pca.desde<=current_date
          AND (pca.hasta IS NULL OR pca.hasta>=current_date)
        JOIN patinador pt ON pt.id=pca.patinador_id
        WHERE pc.prueba_id=$1 AND (pc.genero='MIXTO' OR pc.genero=pt.genero)
      ) AS elegible`, [pruebaId,patinadorId],
    );
    return rows[0]?.elegible === true;
  }

  async validaciones(db: Consultor, patinadorId: number) {
    const { rows } = await db.query(
      `SELECT
       (date_part('year',age(current_date,pt.fecha_nacimiento)) < 18) AS menor,
       EXISTS(SELECT 1 FROM poliza po WHERE po.patinador_id=pt.id
         AND po.estado_revision='APROBADA' AND current_date BETWEEN po.vigente_desde AND po.vigente_hasta) AS poliza,
       COALESCE((SELECT estado FROM v_estado_cartera v WHERE v.patinador_id=pt.id),'AL_DIA') AS cartera,
       EXISTS(SELECT 1 FROM autorizacion_acudiente aa WHERE aa.patinador_id=pt.id AND aa.revocada_en IS NULL) AS autorizacion,
       EXISTS(SELECT 1 FROM sancion s WHERE s.patinador_id=pt.id AND s.anulada_en IS NULL
         AND s.desde<=current_date AND (s.hasta IS NULL OR s.hasta>=current_date)) AS sancion
       FROM patinador pt WHERE pt.id=$1 AND pt.activo=true`, [patinadorId],
    );
    return rows[0] ?? null;
  }

  async puedeSolicitar(db: Consultor, usuarioId: number, patinadorId: number) {
    const { rows } = await db.query(
      `SELECT (pt.usuario_id=$1 OR EXISTS(SELECT 1 FROM acudiente_patinador aa
        WHERE aa.patinador_id=pt.id AND aa.acudiente_id=$1 AND aa.desvinculado_en IS NULL)) AS autorizado
       FROM patinador pt WHERE pt.id=$2`, [usuarioId,patinadorId],
    );
    return rows[0]?.autorizado === true;
  }


  async esAcudiente(db: Consultor, usuarioId: number, patinadorId: number) {
    const { rows } = await db.query(
      `SELECT EXISTS(SELECT 1 FROM acudiente_patinador
       WHERE acudiente_id=$1 AND patinador_id=$2 AND desvinculado_en IS NULL) AS autorizado`,
      [usuarioId,patinadorId],
    );
    return rows[0]?.autorizado === true;
  }

  async categoriasVisiblesUsuario(db: Consultor, usuarioId: number, acudiente: boolean) {
    const { rows } = await db.query(
      acudiente
        ? `SELECT DISTINCT pc.categoria_id AS id FROM acudiente_patinador aa
           JOIN patinador_categoria pc ON pc.patinador_id=aa.patinador_id AND pc.hasta IS NULL
           WHERE aa.acudiente_id=$1 AND aa.desvinculado_en IS NULL`
        : `SELECT DISTINCT pc.categoria_id AS id FROM patinador pt
           JOIN patinador_categoria pc ON pc.patinador_id=pt.id AND pc.hasta IS NULL
           WHERE pt.usuario_id=$1`,
      [usuarioId],
    );
    return rows.map((r:any)=>r.id as number);
  }

  async crearInscripcion(db: Consultor, x: any, usuarioId: number, valid: any, confirmar: boolean) {
    const { rows } = await db.query(
      `INSERT INTO inscripcion (prueba_id,patinador_id,solicitada_por,autorizada_por_acudiente,autorizada_en)
       VALUES ($1,$2,$3,
         CASE WHEN $4 THEN $3 ELSE NULL END,
         CASE WHEN $4 THEN now() ELSE NULL END) RETURNING id`,
      [x.pruebaId,x.patinadorId,usuarioId,confirmar],
    );
    const id = rows[0].id as number;
    const menor = valid.menor === true;
    const checks = [
      ['POLIZA', valid.poliza === true || !menor, valid.poliza ? 'Póliza aprobada y vigente' : menor ? 'No existe póliza médica aprobada y vigente' : 'No requerida para mayores de edad'],
      ['CARTERA', valid.cartera !== 'VENCIDO', valid.cartera === 'VENCIDO' ? 'El patinador tiene cartera vencida' : `Estado de cartera: ${valid.cartera}`],
      ['AUTORIZACION', !menor || (valid.autorizacion === true && confirmar), !menor ? 'No requerida para mayores de edad' : (valid.autorizacion && confirmar ? 'Autorización general y confirmación digital registradas' : 'Falta la autorización o confirmación digital del acudiente')],
      ['SANCION', valid.sancion !== true, valid.sancion ? 'El patinador tiene una sanción disciplinaria activa' : 'Sin sanciones activas'],
    ] as const;
    for (const [tipo, aprobada, detalle] of checks) {
      await db.query(`INSERT INTO inscripcion_validacion (inscripcion_id,tipo,aprobada,detalle) VALUES ($1,$2,$3,$4)`,
        [id,tipo,aprobada,detalle]);
    }
    const aprobada = checks.every((x) => x[1]);
    await db.query(`UPDATE inscripcion SET estado=$2,resuelta_en=now() WHERE id=$1`, [id,aprobada?'APROBADA':'RECHAZADA']);
    return { id, estado: aprobada?'APROBADA':'RECHAZADA',
      validaciones: checks.map(([tipo,ok,detalle])=>({tipo,aprobada:ok,detalle})) };
  }

  async inscripciones(db: Consultor, pruebaId: number) {
    const { rows } = await db.query(
      `SELECT i.id, i.estado, i.solicitada_en AS "solicitadaEn",
        pt.id AS "patinadorId", pt.nombres || ' ' || pt.apellidos AS patinador,
        COALESCE(json_agg(json_build_object('tipo',iv.tipo,'aprobada',iv.aprobada,'detalle',iv.detalle))
          FILTER (WHERE iv.tipo IS NOT NULL),'[]') AS validaciones
       FROM inscripcion i JOIN patinador pt ON pt.id=i.patinador_id
       LEFT JOIN inscripcion_validacion iv ON iv.inscripcion_id=i.id
       WHERE i.prueba_id=$1 GROUP BY i.id,pt.id ORDER BY i.solicitada_en DESC`, [pruebaId],
    );
    return rows;
  }

  async participantesResultado(db: Consultor, pruebaId: number) {
    const { rows } = await db.query(
      `SELECT i.id AS "inscripcionId", pt.id AS "patinadorId",
        pt.nombres || ' ' || pt.apellidos AS patinador, COALESCE(ca.nombre,'Sin categoría') AS categoria,
        r.id AS "resultadoId", r.tiempo_ms AS "tiempoMs", r.no_finalizo AS "noFinalizo", r.observaciones
       FROM inscripcion i JOIN patinador pt ON pt.id=i.patinador_id
       JOIN prueba pr ON pr.id=i.prueba_id JOIN competencia co ON co.id=pr.competencia_id
       LEFT JOIN patinador_categoria pca ON pca.patinador_id=pt.id
         AND pca.desde<=co.fecha_hora::date AND (pca.hasta IS NULL OR pca.hasta>=co.fecha_hora::date)
       LEFT JOIN categoria ca ON ca.id=pca.categoria_id
       LEFT JOIN resultado r ON r.inscripcion_id=i.id
       WHERE i.prueba_id=$1 AND i.estado='APROBADA'
       ORDER BY r.no_finalizo NULLS FIRST, r.tiempo_ms NULLS LAST, patinador`, [pruebaId],
    );
    return rows;
  }

  async guardarResultado(db: Consultor, x: any, usuarioId: number, tiempoMs: number | null) {
    const { rows } = await db.query(
      `INSERT INTO resultado (inscripcion_id,tiempo_ms,no_finalizo,observaciones,registrado_por)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (inscripcion_id) DO UPDATE SET tiempo_ms=EXCLUDED.tiempo_ms,
         no_finalizo=EXCLUDED.no_finalizo, observaciones=EXCLUDED.observaciones,
         actualizado_en=now()
       RETURNING id`, [x.inscripcionId,tiempoMs,x.noFinalizo,x.observaciones ?? null,usuarioId],
    );
    return rows[0].id as number;
  }

  async tablaResultados(db: Consultor, pruebaId: number) {
    const { rows } = await db.query(
      `SELECT r.id AS "resultadoId", pt.nombres || ' ' || pt.apellidos AS patinador,
        COALESCE(ca.nombre,'Sin categoría') AS categoria, r.tiempo_ms AS "tiempoMs",
        COALESCE(r.no_finalizo,true) AS "noFinalizo", COALESCE(r.puntos,0) AS puntos, r.observaciones
       FROM inscripcion i JOIN patinador pt ON pt.id=i.patinador_id
       JOIN prueba p ON p.id=i.prueba_id JOIN competencia c ON c.id=p.competencia_id
       LEFT JOIN resultado r ON r.inscripcion_id=i.id
       LEFT JOIN patinador_categoria pca ON pca.patinador_id=pt.id
         AND pca.desde<=c.fecha_hora::date AND (pca.hasta IS NULL OR pca.hasta>=c.fecha_hora::date)
       LEFT JOIN categoria ca ON ca.id=pca.categoria_id
       WHERE i.prueba_id=$1 AND i.estado='APROBADA'
       ORDER BY COALESCE(r.no_finalizo,true) ASC, r.tiempo_ms ASC NULLS LAST, patinador`, [pruebaId],
    );
    return rows.map((r: any, i: number) => ({ ...r, puesto: r.noFinalizo ? null : i + 1 }));
  }

  async ranking(db: Consultor, categoriaId?: number, nivelId?: number, categoriasPermitidas?: number[]) {
    const { rows } = await db.query(
      `SELECT pt.id AS "patinadorId", pt.nombres || ' ' || pt.apellidos AS patinador,
        ca.nombre AS categoria, nv.nombre AS nivel, COALESCE(sum(r.puntos),0) AS puntos,
        count(r.id)::int AS competencias
       FROM resultado r JOIN inscripcion i ON i.id=r.inscripcion_id
       JOIN patinador pt ON pt.id=i.patinador_id
       JOIN prueba pr ON pr.id=i.prueba_id JOIN competencia co ON co.id=pr.competencia_id
       LEFT JOIN patinador_categoria pc ON pc.patinador_id=pt.id
         AND pc.desde<=co.fecha_hora::date AND (pc.hasta IS NULL OR pc.hasta>=co.fecha_hora::date)
       LEFT JOIN categoria ca ON ca.id=pc.categoria_id
       LEFT JOIN patinador_nivel pn ON pn.patinador_id=pt.id
         AND pn.desde<=co.fecha_hora::date AND (pn.hasta IS NULL OR pn.hasta>=co.fecha_hora::date)
       LEFT JOIN nivel nv ON nv.id=pn.nivel_id
       WHERE r.no_finalizo=false AND ($1::bigint IS NULL OR ca.id=$1)
         AND ($2::bigint IS NULL OR nv.id=$2)\n         AND ($3::bigint[] IS NULL OR ca.id=ANY($3))
       GROUP BY pt.id,ca.nombre,nv.nombre ORDER BY puntos DESC, patinador`, [categoriaId ?? null,nivelId ?? null,categoriasPermitidas ?? null],
    );
    return rows.map((r: any, i: number) => ({ ...r, puesto: i + 1 }));
  }

  async rendimiento(db: Consultor, patinadorId: number) {
    const { rows } = await db.query(
      `SELECT c.nombre AS competencia, c.fecha_hora AS fecha, p.modalidad, p.distancia_metros AS distancia,
        r.tiempo_ms AS "tiempoMs", r.no_finalizo AS "noFinalizo", r.puesto, r.puntos
       FROM resultado r JOIN inscripcion i ON i.id=r.inscripcion_id
       JOIN prueba p ON p.id=i.prueba_id JOIN competencia c ON c.id=p.competencia_id
       WHERE i.patinador_id=$1 ORDER BY c.fecha_hora ASC`, [patinadorId],
    );
    const records = await db.query(
      `SELECT row_number() OVER (ORDER BY modalidad,distancia_metros)::int AS "pruebaId",
        modalidad, distancia_metros AS distancia, mejor_tiempo_ms AS "recordMs"
       FROM v_record_personal WHERE patinador_id=$1 ORDER BY modalidad,distancia_metros`, [patinadorId],
    );
    return { historial: rows, records: records.rows };
  }


  async marcaAnterior(db: Consultor, inscripcionId: number) {
    const { rows } = await db.query(
      `SELECT i.patinador_id AS "patinadorId", p.modalidad, p.distancia_metros AS distancia,
        (SELECT min(r2.tiempo_ms) FROM resultado r2
         JOIN inscripcion i2 ON i2.id=r2.inscripcion_id JOIN prueba p2 ON p2.id=i2.prueba_id
         WHERE i2.patinador_id=i.patinador_id AND p2.modalidad=p.modalidad
           AND p2.distancia_metros=p.distancia_metros AND r2.no_finalizo=false) AS "marcaAnteriorMs"
       FROM inscripcion i JOIN prueba p ON p.id=i.prueba_id WHERE i.id=$1`, [inscripcionId],
    );
    return rows[0] ?? null;
  }

  async marcaActual(db: Consultor, patinadorId: number, modalidad: string, distancia: number) {
    const { rows } = await db.query(
      `SELECT mejor_tiempo_ms AS "mejorTiempoMs" FROM v_record_personal
       WHERE patinador_id=$1 AND modalidad=$2 AND distancia_metros=$3`,
      [patinadorId,modalidad,distancia],
    );
    return rows[0]?.mejorTiempoMs ?? null;
  }

  async historialCorrecciones(db: Consultor, resultadoId: number) {
    const { rows } = await db.query(
      `SELECT cr.id,cr.tiempo_anterior_ms AS "tiempoAnteriorMs",
        cr.tiempo_nuevo_ms AS "tiempoNuevoMs",cr.no_finalizo_anterior AS "noFinalizoAnterior",
        cr.no_finalizo_nuevo AS "noFinalizoNuevo",cr.motivo,cr.corregido_en AS "corregidoEn",
        u.nombres || ' ' || u.apellidos AS "corregidoPor"
       FROM correccion_resultado cr LEFT JOIN usuario u ON u.id=cr.corregido_por
       WHERE cr.resultado_id=$1 ORDER BY cr.corregido_en DESC,cr.id DESC`, [resultadoId],
    );
    return rows;
  }

  async inscripcionResultado(db: Consultor, resultadoId: number) {
    const { rows } = await db.query(
      `SELECT r.id,r.tiempo_ms AS "tiempoAnteriorMs",r.no_finalizo AS "noFinalizoAnterior",
        i.prueba_id AS "pruebaId", i.patinador_id AS "patinadorId"
       FROM resultado r JOIN inscripcion i ON i.id=r.inscripcion_id WHERE r.id=$1 FOR UPDATE`, [resultadoId],
    );
    return rows[0] ?? null;
  }

  async corregir(db: Consultor, id: number, x: any, tiempoMs: number | null) {
    await db.query(
      `INSERT INTO correccion_resultado (resultado_id,tiempo_anterior_ms,tiempo_nuevo_ms,
        no_finalizo_anterior,no_finalizo_nuevo,motivo,corregido_por)
       SELECT id,tiempo_ms,$2,no_finalizo,$3,$4,$5 FROM resultado WHERE id=$1`,
      [id,tiempoMs,x.noFinalizo,x.motivo.trim(),x.usuarioId],
    );
    await db.query(
      `UPDATE resultado SET tiempo_ms=$2,no_finalizo=$3,observaciones=$4,actualizado_en=now() WHERE id=$1`,
      [id,tiempoMs,x.noFinalizo,x.observaciones ?? null],
    );
  }

  async recalcularPuestos(db: Consultor, pruebaId: number) {
    await db.query(
      `WITH orden AS (
        SELECT r.id, CASE WHEN r.no_finalizo THEN NULL ELSE
          row_number() OVER (ORDER BY r.tiempo_ms ASC NULLS LAST, r.id) END AS puesto
        FROM resultado r JOIN inscripcion i ON i.id=r.inscripcion_id WHERE i.prueba_id=$1
      ) UPDATE resultado r SET puesto=orden.puesto FROM orden WHERE r.id=orden.id`, [pruebaId],
    );
  }

  async publicarResultados(db: Consultor, competenciaId: number) {
    await db.query(`UPDATE competencia SET estado='FINALIZADA', actualizado_en=now() WHERE id=$1`, [competenciaId]);
  }

  async pruebasCompetencia(db: Consultor, pruebaId: number) {
    const { rows } = await db.query(
      `SELECT p.id,p.competencia_id AS "competenciaId",c.nombre AS competencia,c.estado AS "estadoCompetencia",
        c.fecha_hora AS "fechaHora"
       FROM prueba p JOIN competencia c ON c.id=p.competencia_id WHERE p.id=$1`, [pruebaId],
    );
    return rows[0] ?? null;
  }

  async existeInscripcion(db: Consultor, id: number) {
    const { rows } = await db.query(
      `SELECT i.id,i.estado,i.prueba_id AS "pruebaId",i.patinador_id AS "patinadorId"
       FROM inscripcion i WHERE i.id=$1`, [id],
    );
    return rows[0] ?? null;
  }
}
