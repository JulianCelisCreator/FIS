import { Injectable } from '@nestjs/common';
import type { Consultor } from '../../../common/database/base-datos.service.js';

export interface Plan {
  id: number;
  nombre: string;
  tipo: 'DIA_UNICO' | 'TRES_DIAS' | 'SEIS_DIAS' | 'SEIS_DIAS_GIMNASIO';
  diasPorSemana: number | null;
  periodicidad: 'MENSUAL' | 'POR_SESION';
  diaLimitePago: number | null;
  estado: 'ACTIVO' | 'INACTIVO';
}

export interface Tarifa {
  id: number;
  valor: number;
  vigenteDesde: string;
}

@Injectable()
export class PlanesRepository {
  async obtener(consultor: Consultor, planId: number): Promise<Plan | null> {
    const { rows } = await consultor.query<Plan>(
      `SELECT id, nombre, tipo,
              dias_por_semana AS "diasPorSemana",
              periodicidad,
              dia_limite_pago AS "diaLimitePago",
              estado
       FROM plan WHERE id = $1`,
      [planId],
    );
    return rows[0] ?? null;
  }

  /** Tarifa del plan vigente en `fecha` (la de vigente_desde más reciente que no la supera). */
  async tarifaVigente(consultor: Consultor, planId: number, fecha: string): Promise<Tarifa | null> {
    const { rows } = await consultor.query<Tarifa>(
      `SELECT id, valor, vigente_desde AS "vigenteDesde"
       FROM tarifa
       WHERE plan_id = $1 AND vigente_desde <= $2
       ORDER BY vigente_desde DESC
       LIMIT 1`,
      [planId, fecha],
    );
    return rows[0] ?? null;
  }
}
