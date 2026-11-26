import { Injectable } from '@nestjs/common';
import type { Consultor } from '../../../common/database/base-datos.service.js';
import { hoyEnClub } from '../../../common/utils/fecha-club.js';
import type { ArchivoGuardado } from '../utils/archivo-poliza.js';
import {
  calcularEstadoPoliza,
  type EstadoPoliza,
} from '../utils/estado-poliza.js';

export type EstadoRevisionPoliza = 'PENDIENTE' | 'APROBADA' | 'RECHAZADA';

export interface ArchivoPoliza {
  nombre: string;
  tipo: string;
  tamano: number;
}

/** Póliza tal como la muestra la Card (HU-M1-10). */
export interface PolizaRegistrada {
  id: number;
  aseguradora: string;
  numeroPoliza: string;
  /** 'AAAA-MM-DD'. */
  vigenteDesde: string;
  /** 'AAAA-MM-DD'. */
  vigenteHasta: string;
  estado: EstadoPoliza;
  estadoRevision: EstadoRevisionPoliza;
  archivo: ArchivoPoliza | null;
  /** ISO de la marca de tiempo del registro. */
  registradaEn: string;
  registradaPor: { id: number; nombre: string } | null;
}

interface FilaPoliza {
  id: number;
  aseguradora: string;
  numeroPoliza: string;
  vigenteDesde: string;
  vigenteHasta: string;
  archivoUrl: string | null;
  archivoNombre: string | null;
  archivoTipo: string | null;
  archivoTamano: number | null;
  estadoRevision: EstadoRevisionPoliza;
  creadoEn: string | Date;
  registradoPorId: number | null;
  registradoPorNombre: string | null;
}

export interface NuevaPoliza {
  patinadorId: number;
  aseguradora: string;
  numeroPoliza: string;
  vigenteDesde: string;
  vigenteHasta: string;
  archivo: ArchivoGuardado;
  registradoPor: number;
}

export interface ArchivoDePoliza {
  numeroPoliza: string;
  archivoUrl: string;
  archivoNombre: string | null;
  archivoTipo: string | null;
}

const SELECT_POLIZA = `
  SELECT po.id,
         po.aseguradora,
         po.numero_poliza AS "numeroPoliza",
         po.vigente_desde AS "vigenteDesde",
         po.vigente_hasta AS "vigenteHasta",
         po.archivo_url AS "archivoUrl",
         po.archivo_nombre AS "archivoNombre",
         po.archivo_tipo AS "archivoTipo",
         po.archivo_tamano AS "archivoTamano",
         po.estado_revision AS "estadoRevision",
         po.creado_en AS "creadoEn",
         u.id AS "registradoPorId",
         u.nombres || ' ' || u.apellidos AS "registradoPorNombre"
  FROM poliza po
  LEFT JOIN usuario u ON u.id = po.registrado_por
`;

/** Lecturas y escrituras de la póliza médica (HU-M1-10). */
@Injectable()
export class PolizasRepository {
  /** Historial completo; la primera fila es la póliza actual. */
  async listar(
    consultor: Consultor,
    patinadorId: number,
  ): Promise<PolizaRegistrada[]> {
    const { rows } = await consultor.query<FilaPoliza>(
      `${SELECT_POLIZA}
       WHERE po.patinador_id = $1
       ORDER BY po.vigente_hasta DESC, po.creado_en DESC, po.id DESC`,
      [patinadorId],
    );
    const hoy = hoyEnClub();
    return rows.map((fila) => mapear(fila, hoy));
  }

  async crear(consultor: Consultor, nueva: NuevaPoliza): Promise<number> {
    const { rows } = await consultor.query<{ id: number }>(
      `INSERT INTO poliza
         (patinador_id, aseguradora, numero_poliza, vigente_desde, vigente_hasta,
          archivo_url, archivo_nombre, archivo_tipo, archivo_tamano,
          estado_revision, registrado_por)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'APROBADA', $10)
       RETURNING id`,
      [
        nueva.patinadorId,
        nueva.aseguradora,
        nueva.numeroPoliza,
        nueva.vigenteDesde,
        nueva.vigenteHasta,
        nueva.archivo.clave,
        nueva.archivo.nombre,
        nueva.archivo.tipo,
        nueva.archivo.tamano,
        nueva.registradoPor,
      ],
    );
    return rows[0].id;
  }

  async obtenerArchivo(
    consultor: Consultor,
    patinadorId: number,
    polizaId: number,
  ): Promise<ArchivoDePoliza | null> {
    const { rows } = await consultor.query<ArchivoDePoliza>(
      `SELECT numero_poliza AS "numeroPoliza",
              archivo_url AS "archivoUrl",
              archivo_nombre AS "archivoNombre",
              archivo_tipo AS "archivoTipo"
       FROM poliza
       WHERE id = $1 AND patinador_id = $2`,
      [polizaId, patinadorId],
    );
    return rows[0] ?? null;
  }
}

function mapear(fila: FilaPoliza, hoy: string): PolizaRegistrada {
  return {
    id: fila.id,
    aseguradora: fila.aseguradora,
    numeroPoliza: fila.numeroPoliza,
    vigenteDesde: fila.vigenteDesde,
    vigenteHasta: fila.vigenteHasta,
    estado: calcularEstadoPoliza(fila, hoy),
    estadoRevision: fila.estadoRevision,
    archivo:
      fila.archivoUrl === null
        ? null
        : {
            nombre: fila.archivoNombre ?? 'Documento de la póliza',
            tipo: fila.archivoTipo ?? 'application/octet-stream',
            tamano: fila.archivoTamano ?? 0,
          },
    registradaEn: new Date(fila.creadoEn).toISOString(),
    registradaPor:
      fila.registradoPorId === null
        ? null
        : {
            id: fila.registradoPorId,
            nombre: fila.registradoPorNombre ?? 'Usuario',
          },
  };
}
