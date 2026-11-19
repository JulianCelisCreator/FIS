import type { PatinadorM5 } from '../types/m5.types.ts'

/** «TI 1023456789 · 12 años (menor de edad)» */
export function detallePatinador(patinador: PatinadorM5): string {
  const edad = `${patinador.edad} años${patinador.esMenor ? ' (menor de edad)' : ''}`
  return `${patinador.tipoDocumento} ${patinador.numeroDocumento} · ${edad}`
}

export function acudientesDe(patinador: PatinadorM5): string {
  if (patinador.acudientes.length === 0) return patinador.esMenor ? 'Sin acudiente asociado' : '— (mayor de edad)'
  return patinador.acudientes.map((a) => `${a.nombre} (${a.parentesco})`).join(', ')
}
