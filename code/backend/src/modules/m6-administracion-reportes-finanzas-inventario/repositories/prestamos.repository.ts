import { Injectable } from '@nestjs/common';
import { BaseDatosService, Consultor } from '../../../common/database/base-datos.service.js';
import type { CrearPrestamoDto, RecibirPrestamoDto } from '../dto/prestamos.dto.js';

@Injectable()
export class PrestamosRepository {
  constructor(private readonly baseDatos: BaseDatosService) {}

  listar() {
    return this.baseDatos.consultar(
      `SELECT p.id, p.uniforme_id AS "uniformeId", p.patinador_id AS "patinadorId",
              p.responsable_id AS "responsableId", p.cantidad,
              p.fecha_prestamo AS "fechaPrestamo",
              p.fecha_devolucion_prevista AS "fechaDevolucionPrevista",
              p.estado_entrega AS "estadoEntrega", p.estado,
              p.fecha_recepcion AS "fechaRecepcion",
              p.estado_recepcion AS "estadoRecepcion", p.observacion,
              u.referencia AS uniforme
       FROM prestamo_uniforme p
       JOIN uniforme u ON u.id = p.uniforme_id
       ORDER BY p.fecha_prestamo DESC, p.id DESC`,
    );
  }

  listarPatinadores() {
    return this.baseDatos.consultar<{ id: number; nombre: string }>(
      `SELECT id::int, nombres || ' ' || apellidos AS nombre
       FROM patinador
       WHERE activo = true
       ORDER BY nombres, apellidos`,
    );
  }

  async participantesValidos(
    patinadorId: number,
    responsableId: number,
    consultor: Consultor,
  ): Promise<boolean> {
    const [fila] = await consultor.query<{ valido: boolean }>(
      `SELECT EXISTS (
         SELECT 1
         FROM patinador p
         WHERE p.id = $1 AND p.activo = true
           AND (
             p.usuario_id = $2
             OR EXISTS (
               SELECT 1
               FROM acudiente_patinador ap
               JOIN usuario u ON u.id = ap.acudiente_id
               WHERE ap.patinador_id = p.id
                 AND ap.acudiente_id = $2
                 AND ap.desvinculado_en IS NULL
                 AND u.estado = 'ACTIVA'
             )
           )
       ) AS valido`,
      [patinadorId, responsableId],
    ).then((resultado) => resultado.rows);
    return fila.valido;
  }

  async fechaDevolucionValida(fecha: string, consultor: Consultor): Promise<boolean> {
    const [fila] = await consultor.query<{ valida: boolean }>(
      `SELECT $1::date >= current_date AS valida`,
      [fecha],
    ).then((resultado) => resultado.rows);
    return fila.valida;
  }

  async uniformeApto(id: number, consultor: Consultor) {
    const [fila] = await consultor.query<{ tipo: string; cantidadDisponible: number }>(
      `SELECT tipo, cantidad_disponible AS "cantidadDisponible"
       FROM uniforme WHERE id = $1 AND activo = true FOR UPDATE`,
      [id],
    ).then((resultado) => resultado.rows);
    return fila ?? null;
  }

  async crear(dto: CrearPrestamoDto, usuarioId: number, consultor: Consultor) {
    const [creado] = await consultor.query<{ id: number }>(
      `INSERT INTO prestamo_uniforme
       (uniforme_id, patinador_id, responsable_id, cantidad, fecha_devolucion_prevista,
        estado_entrega, registrado_por)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
      [dto.uniformeId, dto.patinadorId, dto.responsableId, dto.cantidad,
       dto.fechaDevolucionPrevista, dto.estadoEntrega, usuarioId],
    ).then((resultado) => resultado.rows);
    await consultor.query(
      `UPDATE uniforme SET cantidad_disponible = cantidad_disponible - $1 WHERE id = $2`,
      [dto.cantidad, dto.uniformeId],
    );
    await consultor.query(
      `INSERT INTO movimiento_inventario
       (uniforme_id, tipo, cantidad, prestamo_id, observacion, registrado_por)
       VALUES ($1,'PRESTAMO',$2,$3,'Préstamo registrado',$4)`,
      [dto.uniformeId, -dto.cantidad, creado.id, usuarioId],
    );
    return creado;
  }

  async recibir(id: number, dto: RecibirPrestamoDto, usuarioId: number, consultor: Consultor) {
    const [actual] = await consultor.query<{ uniformeId: number; cantidad: number }>(
      `SELECT uniforme_id AS "uniformeId", cantidad FROM prestamo_uniforme
       WHERE id = $1 AND estado = 'ACTIVO' FOR UPDATE`,
      [id],
    ).then((resultado) => resultado.rows);
    if (!actual) return null;

    await consultor.query(
      `UPDATE prestamo_uniforme SET estado = $1, fecha_recepcion = current_date,
       estado_recepcion = $2, observacion = $3, actualizado_en = NOW()
       WHERE id = $4`,
      [dto.estado, dto.estado === 'DEVUELTO' ? dto.estadoRecepcion ?? 'BUEN_ESTADO' : dto.estadoRecepcion ?? 'DANADO',
       dto.observacion ?? null, id],
    );
    if (dto.estado === 'DEVUELTO') {
      await consultor.query(
        `UPDATE uniforme SET cantidad_disponible = cantidad_disponible + $1 WHERE id = $2`,
        [actual.cantidad, actual.uniformeId],
      );
      await consultor.query(
        `INSERT INTO movimiento_inventario
         (uniforme_id, tipo, cantidad, prestamo_id, observacion, registrado_por)
         VALUES ($1,'DEVOLUCION',$2,$3,'Devolución registrada',$4)`,
        [actual.uniformeId, actual.cantidad, id, usuarioId],
      );
    }
    return actual;
  }
}
