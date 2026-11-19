import type { DatosTransaccion, ValoresTransaccion } from '../types/m5.types.ts'

/** Mismas reglas que el backend, para avisar antes de enviar. */
export function erroresTransaccion(
  valores: ValoresTransaccion,
  hoy: string,
): Partial<Record<keyof ValoresTransaccion, string>> {
  const errores: Partial<Record<keyof ValoresTransaccion, string>> = {}
  if (!valores.fechaPago) errores.fechaPago = 'Indica la fecha del pago.'
  else if (valores.fechaPago > hoy) errores.fechaPago = 'La fecha de pago no puede ser posterior a hoy.'
  if (!valores.medioPago) errores.medioPago = 'Elige el medio de pago.'
  else if (valores.medioPago !== 'EFECTIVO' && !valores.referencia.trim()) {
    errores.referencia = 'La referencia es obligatoria para transferencias y consignaciones.'
  }
  return errores
}

export function aDatosTransaccion(valores: ValoresTransaccion): DatosTransaccion {
  return {
    fechaPago: valores.fechaPago,
    medioPago: valores.medioPago as DatosTransaccion['medioPago'],
    referencia: valores.referencia.trim() || undefined,
  }
}
