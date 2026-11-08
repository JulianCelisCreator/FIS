// Formatos colombianos: se reutilizan los del design system para no duplicarlos.
import { formatCOP, formatDate } from '@ds/js/format.js'

export { formatCOP as formatoCop, formatDate as formatoFecha }

const mesAnioFormato = new Intl.DateTimeFormat('es-CO', { month: 'long', year: 'numeric', timeZone: 'UTC' })

/** 'AAAA-MM-DD' → «noviembre de 2026». */
export function formatoMesAnio(iso: string): string {
  const [anio, mes] = iso.split('-').map(Number)
  return mesAnioFormato.format(new Date(Date.UTC(anio, mes - 1, 1)))
}

/** Hoy en la zona horaria del club, 'AAAA-MM-DD'. */
export function hoyEnClub(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

/** Convierte lo que se escribe en un campo de pesos ($ 1.234, 1234) a número, o null. */
export function leerPesos(texto: string): number | null {
  const digitos = texto.replace(/[^0-9]/g, '')
  return digitos === '' ? null : Number(digitos)
}

const fechaDeMarca = new Intl.DateTimeFormat('es-CO', {
  timeZone: 'America/Bogota',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

/** Marca de tiempo ISO de la API (registrado, modificado) → 'DD/MM/AAAA' en hora del club. */
export function formatoFechaDeMarca(iso: string): string {
  return fechaDeMarca.format(new Date(iso))
}
