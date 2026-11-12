import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import pg from 'pg';

/** Lo que necesita un repositorio para consultar: el pool o un cliente dentro de una transacción. */
export type Consultor = Pick<pg.Pool, 'query'>;

// Conversión de tipos de PostgreSQL a JavaScript (OID de pg_type):
// DATE se deja como texto 'YYYY-MM-DD' para que la zona horaria no mueva el día;
// BIGINT y NUMERIC llegan como texto por defecto y se convierten a number
// (los ids y los valores en COP caben sin pérdida en un double).
// Los arreglos de BIGINT no se convierten: en el SQL se agregan como ::int.
pg.types.setTypeParser(pg.types.builtins.DATE, (valor: string) => valor);
pg.types.setTypeParser(pg.types.builtins.INT8, (valor: string) => Number(valor));
pg.types.setTypeParser(pg.types.builtins.NUMERIC, (valor: string) => Number(valor));

@Injectable()
export class BaseDatosService implements OnApplicationShutdown {
  private readonly pool = new pg.Pool({
    host: process.env.DB_HOST ?? '127.0.0.1',
    port: Number(process.env.DB_PORT ?? 5433),
    database: process.env.DB_NAME ?? 'patinaje',
    user: process.env.DB_USER ?? 'patinaje',
    password: process.env.DB_PASSWORD ?? 'patinaje_dev',
    options: '-c timezone=America/Bogota',
    max: Number(process.env.DB_POOL_MAX ?? 10),
  });

  /** Consultor para lecturas y escrituras que no necesitan transacción. */
  get consultor(): Consultor {
    return this.pool;
  }

  async consultar<T extends pg.QueryResultRow>(
    sql: string,
    parametros: unknown[] = [],
  ): Promise<T[]> {
    const resultado = await this.pool.query<T>(sql, parametros);
    return resultado.rows;
  }

  /** Ejecuta `trabajo` en una transacción; si lanza un error, deshace todo. */
  async transaccion<T>(trabajo: (cliente: Consultor) => Promise<T>): Promise<T> {
    const cliente = await this.pool.connect();
    try {
      await cliente.query('BEGIN');
      const resultado = await trabajo(cliente);
      await cliente.query('COMMIT');
      return resultado;
    } catch (error) {
      await cliente.query('ROLLBACK');
      throw error;
    } finally {
      cliente.release();
    }
  }

  async onApplicationShutdown(): Promise<void> {
    await this.pool.end();
  }
}
