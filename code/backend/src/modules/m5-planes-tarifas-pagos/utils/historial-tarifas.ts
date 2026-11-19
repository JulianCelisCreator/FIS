import { sumarDias } from './calculo-cobros.js';

export type EstadoTarifa = 'PROGRAMADA' | 'VIGENTE' | 'HISTORICA';

export interface TarifaRegistrada {
  id: number;
  valor: number;
  vigenteDesde: string;
  registradoPor: string;
  registradoEn: Date;
}

export interface TarifaEnHistorial extends TarifaRegistrada {
  /** Último día en que rige: el día anterior a la siguiente tarifa, o null si no hay siguiente. */
  vigenteHasta: string | null;
  estado: EstadoTarifa;
}

/**
 * Arma el historial de tarifas de un plan (RF-M5-04): cada tarifa rige hasta
 * el día anterior a la siguiente. La vigente es la más reciente que ya empezó;
 * las futuras quedan programadas. Devuelve de la más nueva a la más antigua.
 */
export function construirHistorialTarifas(
  tarifas: TarifaRegistrada[],
  hoy: string,
): TarifaEnHistorial[] {
  const ordenadas = [...tarifas].sort((a, b) => a.vigenteDesde.localeCompare(b.vigenteDesde));
  const vigente = ordenadas.filter((t) => t.vigenteDesde <= hoy).at(-1);

  return ordenadas
    .map((tarifa, i) => {
      const siguiente = ordenadas[i + 1];
      let estado: EstadoTarifa = 'HISTORICA';
      if (tarifa.vigenteDesde > hoy) {
        estado = 'PROGRAMADA';
      } else if (tarifa === vigente) {
        estado = 'VIGENTE';
      }
      return {
        ...tarifa,
        vigenteHasta: siguiente ? sumarDias(siguiente.vigenteDesde, -1) : null,
        estado,
      };
    })
    .reverse();
}
