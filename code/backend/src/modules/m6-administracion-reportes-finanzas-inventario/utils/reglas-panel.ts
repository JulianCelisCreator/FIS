// Reglas del panel general administrativo (HU-6.1).
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
  ingresosPeriodo: number;
}

export function rangoPanel(hoy: string, desde?: string, hasta?: string): { desde: string; hasta: string } {
  if (!desde && !hasta) return { desde: `${hoy.slice(0, 8)}01`, hasta: hoy };
  return validarRango(desde, hasta);
}
