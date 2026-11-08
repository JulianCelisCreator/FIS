// Cálculos de fechas y valores de cobros. Las fechas son texto 'YYYY-MM-DD'
// para no depender de la zona horaria del servidor.

/** Mes comercial usado para prorratear la primera mensualidad. */
export const DIAS_MES_COMERCIAL = 30;

function aFecha(fecha: string): Date {
  const [anio, mes, dia] = fecha.split('-').map(Number);
  return new Date(Date.UTC(anio, mes - 1, dia));
}

function aTexto(fecha: Date): string {
  return fecha.toISOString().slice(0, 10);
}

export function diaDelMes(fecha: string): number {
  return Number(fecha.slice(8, 10));
}

export function sumarDias(fecha: string, dias: number): string {
  const resultado = aFecha(fecha);
  resultado.setUTCDate(resultado.getUTCDate() + dias);
  return aTexto(resultado);
}

export function primerDiaDelMes(fecha: string): string {
  return `${fecha.slice(0, 7)}-01`;
}

export function primerDiaMesSiguiente(fecha: string): string {
  const resultado = aFecha(primerDiaDelMes(fecha));
  resultado.setUTCMonth(resultado.getUTCMonth() + 1);
  return aTexto(resultado);
}

/** 'YYYY-MM' → 'YYYY-MM-01' (formato de cobro.periodo). */
export function periodoDesdeMes(mes: string): string {
  return `${mes}-01`;
}

/** Fecha límite de una mensualidad completa: día `diaLimitePago` del periodo. */
export function fechaLimiteMensualidad(periodo: string, diaLimitePago: number): string {
  return sumarDias(periodo, diaLimitePago - 1);
}

/**
 * Días cobrados en el mes de ingreso, sobre un mes comercial de 30 días e
 * incluyendo el día de inicio. Quien empieza el día 1 paga el mes completo; los
 * días 30 y 31 cuentan como un día.
 */
export function diasCobradosPrimerMes(fechaInicio: string): number {
  return DIAS_MES_COMERCIAL - Math.min(diaDelMes(fechaInicio), DIAS_MES_COMERCIAL) + 1;
}

/** Primera mensualidad prorrateada, redondeada al peso. */
export function valorPrimeraMensualidad(tarifaMensual: number, fechaInicio: string): number {
  return Math.round((tarifaMensual * diasCobradosPrimerMes(fechaInicio)) / DIAS_MES_COMERCIAL);
}

/**
 * La primera mensualidad se paga al ingresar: vence en la fecha de inicio,
 * pero nunca antes del día límite normal del plan.
 */
export function fechaLimitePrimeraMensualidad(fechaInicio: string, diaLimitePago: number): string {
  const limiteNormal = fechaLimiteMensualidad(primerDiaDelMes(fechaInicio), diaLimitePago);
  return fechaInicio > limiteNormal ? fechaInicio : limiteNormal;
}
