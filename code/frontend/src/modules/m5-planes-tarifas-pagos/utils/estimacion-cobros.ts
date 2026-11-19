// Vista previa del resumen antes de confirmar. La regla es la del backend
// (utils/calculo-cobros.ts); los valores definitivos son los que devuelve la API.

const DIAS_MES_COMERCIAL = 30

function aFecha(iso: string): Date {
  const [anio, mes, dia] = iso.split('-').map(Number)
  return new Date(Date.UTC(anio, mes - 1, dia))
}

export function primerDiaDelMes(iso: string): string {
  return `${iso.slice(0, 7)}-01`
}

export function primerDiaMesSiguiente(iso: string): string {
  const fecha = aFecha(primerDiaDelMes(iso))
  fecha.setUTCMonth(fecha.getUTCMonth() + 1)
  return fecha.toISOString().slice(0, 10)
}

export function diaDelMes(iso: string, dia: number): string {
  return `${iso.slice(0, 8)}${String(dia).padStart(2, '0')}`
}

/** Día 1: mes completo; los demás, 30 − día (el 15 paga 15/30); mínimo un día. */
export function diasCobradosPrimerMes(fechaInicio: string): number {
  const dia = Number(fechaInicio.slice(8, 10))
  return dia === 1 ? DIAS_MES_COMERCIAL : Math.max(1, DIAS_MES_COMERCIAL - dia)
}

export function valorPrimeraMensualidad(tarifa: number, fechaInicio: string): number {
  return Math.round((tarifa * diasCobradosPrimerMes(fechaInicio)) / DIAS_MES_COMERCIAL)
}
