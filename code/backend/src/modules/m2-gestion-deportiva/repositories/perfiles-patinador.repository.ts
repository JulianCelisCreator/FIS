import { Injectable } from '@nestjs/common';
import type { Consultor } from '../../../common/database/base-datos.service.js';
import type { CrearPatinadorDto, EditarPatinadorDto } from '../dto/patinador.dto.js';

export interface PerfilPatinador {
  id: number;
  tipoDocumento: string;
  numeroDocumento: string;
  nombres: string;
  apellidos: string;
  fechaNacimiento: string;
  genero: string;
  telefonoContacto: string | null;
  activo: boolean;
}

const CAMPOS = `id, tipo_documento AS "tipoDocumento", numero_documento AS "numeroDocumento",
                nombres, apellidos, fecha_nacimiento AS "fechaNacimiento", genero,
                telefono_contacto AS "telefonoContacto", activo`;

@Injectable()
export class PerfilesPatinadorRepository {
  async listar(db: Consultor): Promise<PerfilPatinador[]> {
    const { rows } = await db.query<PerfilPatinador>(
      `SELECT ${CAMPOS} FROM patinador WHERE activo ORDER BY apellidos, nombres`,
    );
    return rows;
  }

  async buscar(db: Consultor, id: number): Promise<PerfilPatinador | null> {
    const { rows } = await db.query<PerfilPatinador>(
      `SELECT ${CAMPOS} FROM patinador WHERE id = $1 AND activo`, [id],
    );
    return rows[0] ?? null;
  }

  async crear(db: Consultor, datos: CrearPatinadorDto, creadoPor: number): Promise<PerfilPatinador> {
    const { rows } = await db.query<PerfilPatinador>(
      `INSERT INTO patinador
         (tipo_documento, numero_documento, nombres, apellidos, fecha_nacimiento, genero, telefono_contacto, creado_por)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING ${CAMPOS}`,
      [datos.tipoDocumento, datos.numeroDocumento, datos.nombres, datos.apellidos,
        datos.fechaNacimiento, datos.genero, datos.telefonoContacto ?? null, creadoPor],
    );
    return rows[0];
  }

  async actualizar(db: Consultor, id: number, cambios: EditarPatinadorDto): Promise<PerfilPatinador | null> {
    const telefonoDefinido = Object.prototype.hasOwnProperty.call(cambios, 'telefonoContacto');
    const { rows } = await db.query<PerfilPatinador>(
      `UPDATE patinador
       SET tipo_documento = COALESCE($2, tipo_documento),
           numero_documento = COALESCE($3, numero_documento),
           nombres = COALESCE($4, nombres),
           apellidos = COALESCE($5, apellidos),
           fecha_nacimiento = COALESCE($6::date, fecha_nacimiento),
           genero = COALESCE($7, genero),
           telefono_contacto = CASE WHEN $8::boolean THEN $9::text ELSE telefono_contacto END
       WHERE id = $1 AND activo
       RETURNING ${CAMPOS}`,
      [id, cambios.tipoDocumento ?? null, cambios.numeroDocumento ?? null, cambios.nombres ?? null,
        cambios.apellidos ?? null, cambios.fechaNacimiento ?? null, cambios.genero ?? null,
        telefonoDefinido, cambios.telefonoContacto ?? null],
    );
    return rows[0] ?? null;
  }
}
