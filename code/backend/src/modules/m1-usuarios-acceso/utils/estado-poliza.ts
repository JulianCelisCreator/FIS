/**
 * Estados de la póliza (HU-M1-10, CA-03).
 *
 * La vigencia se calcula al consultar, comparando la fecha del club con las
 * fechas de la póliza. No hay proceso programado ni columna de estado: así una
 * póliza pasa a «Vencida» sola al día siguiente de su fecha de fin.
 */
export type EstadoPoliza = 'VIGENTE' | 'VENCIDA' | 'PENDIENTE';

export interface FechasPoliza {
  vigenteDesde: string;
  vigenteHasta: string;
}

/** `hoy` y las fechas llegan como 'AAAA-MM-DD'; la comparación lexicográfica es segura. */
export function calcularEstadoPoliza(
  poliza: FechasPoliza | null,
  hoy: string,
): EstadoPoliza {
  if (!poliza) return 'PENDIENTE';
  if (hoy < poliza.vigenteDesde) return 'PENDIENTE';
  if (hoy > poliza.vigenteHasta) return 'VENCIDA';
  return 'VIGENTE';
}
