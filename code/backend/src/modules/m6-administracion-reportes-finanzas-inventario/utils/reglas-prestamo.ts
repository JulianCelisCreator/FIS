// Reglas de negocio del préstamo de implementos (HU-6.8).

export const TIPO_PRESTABLE = 'IMPLEMENTO';

export interface UniformePrestable {
  tipo: string;
  cantidadDisponible: number;
}

export interface RecepcionSolicitada {
  estado: 'DEVUELTO' | 'PERDIDA_DANO';
  observacion?: string;
}

export class ErrorReglaPrestamo extends Error {
  constructor(
    mensaje: string,
    readonly motivo: 'NO_ENCONTRADO' | 'INVALIDO' = 'INVALIDO',
  ) {
    super(mensaje);
    this.name = 'ErrorReglaPrestamo';
  }
}

export function validarPrestamo<T extends UniformePrestable>(
  uniforme: T | null,
  cantidad: number,
): T {
  if (!uniforme) {
    throw new ErrorReglaPrestamo(
      'El implemento no está disponible',
      'NO_ENCONTRADO',
    );
  }
  if (uniforme.tipo !== TIPO_PRESTABLE) {
    throw new ErrorReglaPrestamo(
      'Solo se pueden prestar implementos; las prendas quedan disponibles para venta',
    );
  }
  if (!Number.isInteger(cantidad) || cantidad < 1) {
    throw new ErrorReglaPrestamo(
      'La cantidad a prestar debe ser un entero mayor que cero',
    );
  }
  if (uniforme.cantidadDisponible < cantidad) {
    throw new ErrorReglaPrestamo(
      'No hay cantidad suficiente para realizar el préstamo',
    );
  }
  return uniforme;
}

/** Una pérdida o un daño exige una observación que lo justifique. */
export function validarRecepcion(recepcion: RecepcionSolicitada): void {
  if (recepcion.estado === 'PERDIDA_DANO' && !recepcion.observacion?.trim()) {
    throw new ErrorReglaPrestamo('Debes explicar la pérdida o el daño');
  }
}

export interface CobroPrestamo {
  dias: number;
  valor: number;
}

const MS_DIA = 86_400_000;

export function calcularCobroPrestamo(
  tarifaDia: number,
  cantidad: number,
  fechaPrestamo: string,
  fechaDevolucionPrevista: string,
): CobroPrestamo {
  if (!Number.isFinite(tarifaDia) || tarifaDia < 0) {
    throw new ErrorReglaPrestamo('La tarifa por día debe ser un valor de cero o más');
  }
  const inicio = Date.parse(`${fechaPrestamo}T00:00:00Z`);
  const fin = Date.parse(`${fechaDevolucionPrevista}T00:00:00Z`);
  if (Number.isNaN(inicio) || Number.isNaN(fin)) {
    throw new ErrorReglaPrestamo('Las fechas del préstamo no son válidas');
  }
  if (fin < inicio) {
    throw new ErrorReglaPrestamo('La fecha prevista debe ser hoy o posterior');
  }
  const dias = Math.max(1, Math.round((fin - inicio) / MS_DIA));
  const valor = Math.round(tarifaDia * cantidad * dias * 100) / 100;
  if (!Number.isFinite(valor) || valor > 999_999_999_999) {
    throw new ErrorReglaPrestamo('El valor del préstamo supera el máximo permitido');
  }
  return { dias, valor };
}

export function unidadesQueRegresan(
  estado: RecepcionSolicitada['estado'],
  cantidad: number,
): number {
  return estado === 'DEVUELTO' ? cantidad : 0;
}
