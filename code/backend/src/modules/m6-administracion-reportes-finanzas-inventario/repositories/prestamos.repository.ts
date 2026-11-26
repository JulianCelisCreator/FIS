import { Injectable } from '@nestjs/common';
import { BaseDatosService, Consultor } from '../../../common/database/base-datos.service.js';
import { CobrosRepository } from '../../m5-planes-tarifas-pagos/repositories/cobros.repository.js';
import type { CrearPrestamoDto, RecibirPrestamoDto } from '../dto/prestamos.dto.js';
import { unidadesQueRegresan, type CobroPrestamo } from '../utils/reglas-prestamo.js';

/** Préstamo con su cobro, nombres y estado derivado (Vencido). */
export interface Prestamo {
  id: number;
  uniformeId: number;
  uniforme: string;
  patinadorId: number;
  patinador: string;
  responsableId: number;
  responsable: string;
  cantidad: number;
  valorPorUnidad: number;
  duracionDias: number;
  valorCobro: number;
  cobroId: number | null;
  saldoPendiente: number;
  fechaPrestamo: string;
  fechaDevolucionPrevista: string;
  estadoEntrega: 'NUEVO' | 'BUEN_ESTADO' | 'CON_DESGASTE';
  estado: 'ACTIVO' | 'DEVUELTO' | 'PERDIDA_DANO';
  estadoActual: 'ACTIVO' | 'VENCIDO' | 'DEVUELTO' | 'PERDIDA_DANO';
  fechaRecepcion: string | null;
  estadoRecepcion: 'BUEN_ESTADO' | 'CON_DESGASTE' | 'DANADO' | null;
  observacion: string | null;
}

/** Patinador activo con quienes pueden responder por el préstamo. */
export interface PatinadorPrestamo {
  id: number;
  nombre: string;
  responsables: { id: number; nombre: string }[];
}

@Injectable()
export class PrestamosRepository {
  constructor(
    private readonly baseDatos: BaseDatosService,
    private readonly cobrosM5: CobrosRepository,
  ) {}

  /** Todos los préstamos, o solo uno si se indica su id. */
  listar(id?: number): Promise<Prestamo[]> {
    return this.baseDatos.consultar<Prestamo>(
      `SELECT p.id, p.uniforme_id AS "uniformeId", u.referencia || ' · ' || u.talla AS uniforme,
              p.patinador_id AS "patinadorId", pa.nombres || ' ' || pa.apellidos AS patinador,
              p.responsable_id AS "responsableId", r.nombres || ' ' || r.apellidos AS responsable,
              p.cantidad, p.tarifa_dia AS "valorPorUnidad", p.dias_cobrados AS "duracionDias",
              p.valor_cobro AS "valorCobro", p.cobro_id AS "cobroId",
              COALESCE(s.saldo, 0) AS "saldoPendiente",
              p.fecha_prestamo AS "fechaPrestamo",
              p.fecha_devolucion_prevista AS "fechaDevolucionPrevista",
              p.estado_entrega AS "estadoEntrega", p.estado, p.estado_actual AS "estadoActual",
              p.fecha_recepcion AS "fechaRecepcion",
              p.estado_recepcion AS "estadoRecepcion", p.observacion
       FROM v_prestamo_uniforme p
       JOIN uniforme u   ON u.id = p.uniforme_id
       JOIN patinador pa ON pa.id = p.patinador_id
       JOIN usuario r    ON r.id = p.responsable_id
       LEFT JOIN v_saldo_cobro s ON s.cobro_id = p.cobro_id
       ${id === undefined ? '' : 'WHERE p.id = $1'}
       ORDER BY (p.estado_actual = 'VENCIDO') DESC, p.fecha_prestamo DESC, p.id DESC`,
      id === undefined ? [] : [id],
    );
  }

  /**
   * Patinadores activos (M2) con sus posibles responsables: su propia cuenta,
   * si la tiene, y sus acudientes vinculados con cuenta activa.
   */
  listarPatinadores(): Promise<PatinadorPrestamo[]> {
    return this.baseDatos.consultar<PatinadorPrestamo>(
      `SELECT p.id, p.nombres || ' ' || p.apellidos AS nombre,
              COALESCE((
                SELECT json_agg(json_build_object('id', x.id, 'nombre', x.nombre) ORDER BY x.orden, x.nombre)
                FROM (
                  SELECT u.id, u.nombres || ' ' || u.apellidos || ' · patinador' AS nombre, 0 AS orden
                  FROM usuario u
                  WHERE u.id = p.usuario_id AND u.estado = 'ACTIVA'
                  UNION ALL
                  SELECT u.id, u.nombres || ' ' || u.apellidos || ' · acudiente' AS nombre, 1 AS orden
                  FROM acudiente_patinador ap
                  JOIN usuario u ON u.id = ap.acudiente_id
                  WHERE ap.patinador_id = p.id AND ap.desvinculado_en IS NULL AND u.estado = 'ACTIVA'
                ) x
              ), '[]'::json) AS responsables
       FROM patinador p
       WHERE p.activo = true
       ORDER BY p.nombres, p.apellidos`,
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

  /** Fecha de hoy en la zona del club ('YYYY-MM-DD'), según la base. */
  async hoy(consultor: Consultor): Promise<string> {
    const [fila] = await consultor
      .query<{ hoy: string }>(`SELECT current_date AS hoy`)
      .then((resultado) => resultado.rows);
    return fila.hoy;
  }

  async uniformeApto(id: number, consultor: Consultor) {
    const [fila] = await consultor.query<{
      referencia: string;
      tipo: string;
      cantidadDisponible: number;
      tarifaPrestamoDia: number;
    }>(
      `SELECT referencia, tipo, cantidad_disponible AS "cantidadDisponible",
              tarifa_prestamo_dia AS "tarifaPrestamoDia"
       FROM uniforme WHERE id = $1 AND activo = true FOR UPDATE`,
      [id],
    ).then((resultado) => resultado.rows);
    return fila ?? null;
  }

  /**
   * Registra el préstamo, su cobro PENDIENTE en M5 (si el valor es mayor que 0),
   * el descuento de stock y el movimiento PRESTAMO, todo con el consultor de la
   * transacción del servicio.
   */
  async crear(
    dto: CrearPrestamoDto,
    tarifaDia: number,
    cobro: CobroPrestamo,
    descripcionCobro: string,
    usuarioId: number,
    consultor: Consultor,
  ) {
    let cobroId: number | null = null;
    if (cobro.valor > 0) {
      cobroId = await this.cobrosM5.crear(consultor, {
        patinadorId: dto.patinadorId,
        asignacionPlanId: null,
        tarifaId: null,
        concepto: 'PRESTAMO_IMPLEMENTO',
        periodo: null,
        descripcion: descripcionCobro,
        valor: cobro.valor,
        fechaLimite: dto.fechaDevolucionPrevista,
        estado: 'PENDIENTE',
        creadoPor: usuarioId,
      });
    }
    const [creado] = await consultor.query<{ id: number }>(
      `INSERT INTO prestamo_uniforme
       (uniforme_id, patinador_id, responsable_id, cantidad, fecha_devolucion_prevista,
        estado_entrega, tarifa_dia, dias_cobrados, valor_cobro, cobro_id, registrado_por)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
      [dto.uniformeId, dto.patinadorId, dto.responsableId, dto.cantidad,
       dto.fechaDevolucionPrevista, dto.estadoEntrega, tarifaDia, cobro.dias, cobro.valor,
       cobroId, usuarioId],
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
    return { id: creado.id, cobroId };
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
       dto.observacion?.trim() || null, id],
    );
    const regresan = unidadesQueRegresan(dto.estado, actual.cantidad);
    if (regresan > 0) {
      await consultor.query(
        `UPDATE uniforme SET cantidad_disponible = cantidad_disponible + $1 WHERE id = $2`,
        [regresan, actual.uniformeId],
      );
      await consultor.query(
        `INSERT INTO movimiento_inventario
         (uniforme_id, tipo, cantidad, prestamo_id, observacion, registrado_por)
         VALUES ($1,'DEVOLUCION',$2,$3,'Devolución registrada',$4)`,
        [actual.uniformeId, regresan, id, usuarioId],
      );
    }
    return actual;
  }
}
