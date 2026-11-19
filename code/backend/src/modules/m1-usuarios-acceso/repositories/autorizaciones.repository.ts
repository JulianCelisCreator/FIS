import { Injectable } from '@nestjs/common';
import type { Consultor } from '../../../common/database/base-datos.service.js';

export type EstadoPerfil = 'BLOQUEADO' | 'HABILITADO';
export type RequisitoPerfil = 'AUTORIZACION' | 'POLIZA';

export interface AcudienteVinculado {
  id: number;
  nombre: string;
  parentesco: string;
  esPrincipal: boolean;
}

export interface AutorizacionRegistrada {
  id: number;
  fechaAutorizacion: string;
  /** Fecha y hora exactas del registro (CA-01 / CA-03). */
  registradaEn: string;
  versionTexto: string;
  acudiente: { id: number; nombre: string };
}

export interface PerfilPatinador {
  estado: EstadoPerfil;
  tienePolizaVigente: boolean;
  requisitosFaltantes: RequisitoPerfil[];
}

/** Ficha que consume la pantalla «Familia del menor» y el servicio reutilizable de M4. */
export interface PatinadorConAutorizacion {
  id: number;
  nombre: string;
  tipoDocumento: string;
  numeroDocumento: string;
  edad: number;
  esMenor: boolean;
  activo: boolean;
  acudientes: AcudienteVinculado[];
  autorizacion: AutorizacionRegistrada | null;
  perfil: PerfilPatinador;
}

interface AutorizacionFila {
  id: number;
  fechaAutorizacion: string;
  registradaEn: string;
  versionTexto: string;
  acudiente: { id: number; nombre: string };
}

interface FilaPatinador {
  patinadorId: number;
  nombre: string;
  tipoDocumento: string;
  numeroDocumento: string;
  edad: number;
  esMenor: boolean;
  activo: boolean;
  estadoPerfil: EstadoPerfil;
  tieneAutorizacion: boolean;
  tienePolizaVigente: boolean;
  acudientes: AcudienteVinculado[];
  autorizacion: AutorizacionFila | null;
}

interface AlcanceAutorizaciones {
  /** El Administrador consulta a todos; el Acudiente, solo a sus patinadores. */
  todos: boolean;
  usuarioId: number;
}

export interface NuevaAutorizacion {
  patinadorId: number;
  acudienteId: number;
  fechaAutorizacion: string;
  versionTexto: string;
  registradoPor: number;
}

/** Columnas comunes de la ficha y su estado de perfil (v_perfil_patinador). */
const SELECT_FICHA = `
  SELECT p.id AS "patinadorId",
         p.nombres || ' ' || p.apellidos AS nombre,
         p.tipo_documento AS "tipoDocumento",
         p.numero_documento AS "numeroDocumento",
         vp.edad,
         vp.es_menor AS "esMenor",
         p.activo,
         vp.estado_perfil AS "estadoPerfil",
         vp.tiene_autorizacion AS "tieneAutorizacion",
         vp.tiene_poliza_vigente AS "tienePolizaVigente",
         COALESCE((
           SELECT json_agg(json_build_object(
                    'id', u.id,
                    'nombre', u.nombres || ' ' || u.apellidos,
                    'parentesco', ap.parentesco,
                    'esPrincipal', ap.es_principal) ORDER BY ap.es_principal DESC, u.nombres)
           FROM acudiente_patinador ap
           JOIN usuario u ON u.id = ap.acudiente_id
           WHERE ap.patinador_id = p.id AND ap.desvinculado_en IS NULL
         ), '[]'::json) AS acudientes,
         (SELECT json_build_object(
                   'id', a.id,
                   'fechaAutorizacion', a.fecha_autorizacion,
                   'registradaEn', a.creado_en,
                   'versionTexto', a.version_texto,
                   'acudiente', json_build_object(
                     'id', u.id,
                     'nombre', u.nombres || ' ' || u.apellidos))
          FROM autorizacion_acudiente a
          JOIN usuario u ON u.id = a.acudiente_id
          WHERE a.patinador_id = p.id AND a.revocada_en IS NULL
          ORDER BY a.creado_en DESC
          LIMIT 1) AS autorizacion
  FROM patinador p
  JOIN v_perfil_patinador vp ON vp.patinador_id = p.id
`;

/** Lecturas y escrituras de la autorización del acudiente (M1-09). */
@Injectable()
export class AutorizacionesRepository {
  /** Patinadores visibles para el usuario, con su autorización y estado de perfil. */
  async listar(
    consultor: Consultor,
    alcance: AlcanceAutorizaciones,
  ): Promise<PatinadorConAutorizacion[]> {
    const { rows } = await consultor.query<FilaPatinador>(
      `${SELECT_FICHA}
       WHERE p.activo
         AND ($1::boolean
              OR EXISTS (SELECT 1 FROM acudiente_patinador ap
                         WHERE ap.patinador_id = p.id
                           AND ap.acudiente_id = $2
                           AND ap.desvinculado_en IS NULL))
       ORDER BY vp.es_menor DESC, p.nombres, p.apellidos`,
      [alcance.todos, alcance.usuarioId],
    );
    return rows.map(mapearFicha);
  }

  /** Ficha de un patinador, aunque esté inactivo (el servicio decide si se puede registrar). */
  async obtenerDetalle(
    consultor: Consultor,
    patinadorId: number,
  ): Promise<PatinadorConAutorizacion | null> {
    const { rows } = await consultor.query<FilaPatinador>(
      `${SELECT_FICHA} WHERE p.id = $1`,
      [patinadorId],
    );
    return rows[0] ? mapearFicha(rows[0]) : null;
  }

  /** Serializa dos registros simultáneos del mismo patinador durante la transacción. */
  async bloquear(consultor: Consultor, patinadorId: number): Promise<void> {
    await consultor.query('SELECT id FROM patinador WHERE id = $1 FOR UPDATE', [
      patinadorId,
    ]);
  }

  async crear(consultor: Consultor, nueva: NuevaAutorizacion): Promise<number> {
    const { rows } = await consultor.query<{ id: number }>(
      `INSERT INTO autorizacion_acudiente
         (patinador_id, acudiente_id, fecha_autorizacion, version_texto, registrado_por)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [
        nueva.patinadorId,
        nueva.acudienteId,
        nueva.fechaAutorizacion,
        nueva.versionTexto,
        nueva.registradoPor,
      ],
    );
    return rows[0].id;
  }

  /**
   * Requisito reutilizable por M4 (RF-M4-09): ¿el patinador tiene una
   * autorización vigente? No edita ni revoca; la autorización es inmutable.
   */
  async estaVigente(
    consultor: Consultor,
    patinadorId: number,
  ): Promise<boolean> {
    const { rows } = await consultor.query<{ vigente: boolean }>(
      `SELECT EXISTS (
         SELECT 1 FROM autorizacion_acudiente
         WHERE patinador_id = $1 AND revocada_en IS NULL
       ) AS vigente`,
      [patinadorId],
    );
    return rows[0].vigente;
  }
}

function mapearFicha(fila: FilaPatinador): PatinadorConAutorizacion {
  const requisitosFaltantes: RequisitoPerfil[] = [];
  if (fila.esMenor && !fila.tieneAutorizacion)
    requisitosFaltantes.push('AUTORIZACION');
  if (fila.esMenor && !fila.tienePolizaVigente)
    requisitosFaltantes.push('POLIZA');

  return {
    id: fila.patinadorId,
    nombre: fila.nombre,
    tipoDocumento: fila.tipoDocumento,
    numeroDocumento: fila.numeroDocumento,
    edad: fila.edad,
    esMenor: fila.esMenor,
    activo: fila.activo,
    acudientes: fila.acudientes,
    autorizacion: fila.autorizacion
      ? {
          id: fila.autorizacion.id,
          fechaAutorizacion: fila.autorizacion.fechaAutorizacion,
          registradaEn: new Date(fila.autorizacion.registradaEn).toISOString(),
          versionTexto: fila.autorizacion.versionTexto,
          acudiente: fila.autorizacion.acudiente,
        }
      : null,
    perfil: {
      estado: fila.estadoPerfil,
      tienePolizaVigente: fila.tienePolizaVigente,
      requisitosFaltantes,
    },
  };
}
