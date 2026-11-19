import { Injectable } from '@nestjs/common';
import { BaseDatosService } from '../../../common/database/base-datos.service.js';
import type { ConteosPanel } from '../utils/reglas-panel.js';

// KPI del panel (HU-6.1) en una sola consulta de solo lectura. Lee M2
// (patinador), M3 (grupo), M6 (personal, uniforme) y M5 (v_estado_cartera).
// Profesores activos = personal con cargo PROFESOR y estado ACTIVO (decisión
// del grupo, 18/11). Grupos activos queda en 0 hasta que M3 registre grupos.
const SQL_CONTEOS = `
  SELECT
    (SELECT count(*) FROM patinador WHERE activo)::int AS "patinadoresActivos",
    (SELECT count(*) FROM grupo WHERE activo)::int AS "gruposActivos",
    (SELECT count(*) FROM personal WHERE cargo = 'PROFESOR' AND estado = 'ACTIVO')::int AS "profesoresActivos",
    (SELECT COALESCE(sum(saldo_pendiente), 0) FROM v_estado_cartera) AS "carteraPendiente",
    (SELECT count(*) FROM v_estado_cartera WHERE estado = 'VENCIDO')::int AS "patinadoresEnMora",
    (SELECT COALESCE(sum(cantidad_disponible), 0) FROM uniforme WHERE activo)::int AS "unidadesDisponibles",
    (SELECT count(*) FROM uniforme WHERE activo)::int AS "referenciasActivas",
    (SELECT count(*) FROM v_stock_uniforme WHERE estado_stock = 'ALERTA_MINIMO')::int AS "referenciasBajoMinimo"`;

@Injectable()
export class PanelRepository {
  constructor(private readonly baseDatos: BaseDatosService) {}

  async conteos(): Promise<ConteosPanel> {
    const [fila] = await this.baseDatos.consultar<ConteosPanel & Record<string, unknown>>(SQL_CONTEOS);
    return fila;
  }
}
