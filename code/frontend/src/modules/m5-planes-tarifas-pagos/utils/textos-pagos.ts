import { formatoMesAnio } from '../../../shared/utils/formato.ts'
import { MEDIOS_PAGO, type PagoHistorial } from '../types/m5.types.ts'

/** «Noviembre de 2026» para mensualidades; la descripción para los demás cobros. */
export function nombreCobro(cobro: { concepto: string; descripcion: string | null; periodo: string | null }): string {
  if (cobro.concepto === 'MENSUALIDAD' && cobro.periodo) {
    const texto = formatoMesAnio(cobro.periodo)
    return texto.charAt(0).toUpperCase() + texto.slice(1)
  }
  return cobro.descripcion ?? cobro.concepto
}

/** Qué pagó: los cobros aplicados o las sesiones. */
export function cobroAplicado(pago: PagoHistorial): string {
  if (pago.tipo === 'SESION' && pago.numeroSesiones) {
    return pago.numeroSesiones === 1 ? '1 sesión' : `${pago.numeroSesiones} sesiones`
  }
  return pago.cobros.map(nombreCobro).join(', ') || '—'
}

export function textoMedio(medio: string): string {
  return MEDIOS_PAGO.find((m) => m.valor === medio)?.texto ?? medio
}
