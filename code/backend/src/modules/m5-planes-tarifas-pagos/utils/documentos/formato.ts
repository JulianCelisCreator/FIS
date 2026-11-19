// Formatos colombianos para los documentos que genera M5 (PDF y XLSX).
import { ZONA_HORARIA_CLUB } from '../../../../common/utils/fecha-club.js';

const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

const MEDIOS: Record<string, string> = {
  EFECTIVO: 'Efectivo',
  TRANSFERENCIA: 'Transferencia',
  CONSIGNACION: 'Consignación',
};

const fechaHoraClub = new Intl.DateTimeFormat('es-CO', {
  timeZone: ZONA_HORARIA_CLUB,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

/** 180000 → «$ 180.000». */
export function cop(valor: number): string {
  return `$ ${Math.trunc(valor).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
}

/** 'AAAA-MM-DD' → 'DD/MM/AAAA'. */
export function fecha(iso: string): string {
  const [anio, mes, dia] = iso.split('-');
  return `${dia}/${mes}/${anio}`;
}

/** Marca de tiempo → 'DD/MM/AAAA, h:mm a. m.' en la hora del club. */
export function fechaHora(momento: Date): string {
  return fechaHoraClub.format(momento);
}

/** '2026-08-01' → 'Agosto 2026'. */
export function mesAnio(periodo: string): string {
  const [anio, mes] = periodo.split('-').map(Number);
  const nombre = MESES[mes - 1];
  return `${nombre.charAt(0).toUpperCase()}${nombre.slice(1)} ${anio}`;
}

export function medio(medioPago: string): string {
  return MEDIOS[medioPago] ?? medioPago;
}

/** Cómo se nombra un cobro: el mes de la mensualidad o su descripción. */
export function nombreCobro(cobro: { concepto: string; descripcion: string | null; periodo: string | null }): string {
  if (cobro.concepto === 'MENSUALIDAD' && cobro.periodo) return mesAnio(cobro.periodo);
  return cobro.descripcion ?? cobro.concepto;
}
