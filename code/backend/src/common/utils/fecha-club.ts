export const ZONA_HORARIA_CLUB = 'America/Bogota';

const formatoFecha = new Intl.DateTimeFormat('en-CA', {
  timeZone: ZONA_HORARIA_CLUB,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** Fecha de hoy en la zona horaria del club, como 'YYYY-MM-DD'. */
export function hoyEnClub(ahora: Date = new Date()): string {
  return formatoFecha.format(ahora);
}
