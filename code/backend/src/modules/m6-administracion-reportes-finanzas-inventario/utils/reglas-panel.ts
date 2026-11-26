// Reglas del panel general administrativo (HU-6.1 / RF-M6-01), sin acceso a
// base de datos. Los KPI de conteo son una foto de hoy; los ingresos se
// recalculan con el período elegido (por defecto, el mes en curso).
import { validarRango } from './reglas-reporte.js';

export interface ConteosPanel {
  patinadoresActivos: number;
  gruposActivos: number;
  profesoresActivos: number;
  carteraPendiente: number;
  patinadoresEnMora: number;
  unidadesDisponibles: number;
  referenciasActivas: number;
  referenciasBajoMinimo: number;
}

export interface PanelAdministrativo extends ConteosPanel {
  desde: string;
  hasta: string;
  generadoEn: string;
  /** Pagos registrados en el período − reembolsos de devoluciones parciales (igual que HU-6.4). */
  ingresosPeriodo: number;
}

/** Sin fechas: del primer día del mes hasta hoy. Con fechas: mismas reglas que los reportes. */
export function rangoPanel(hoy: string, desde?: string, hasta?: string): { desde: string; hasta: string } {
  if (!desde && !hasta) return { desde: `${hoy.slice(0, 8)}01`, hasta: hoy };
  return validarRango(desde, hasta);
}
