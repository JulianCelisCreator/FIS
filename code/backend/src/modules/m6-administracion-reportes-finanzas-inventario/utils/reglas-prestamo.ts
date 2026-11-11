// Reglas de negocio del préstamo de implementos (HU-6.8 / RF-M6-08), sin acceso a
// base de datos para poder probarlas de forma aislada.

/** Único tipo de inventario que se presta; las prendas solo se venden (higiene). */
export const TIPO_PRESTABLE = 'IMPLEMENTO';

/** Datos de la referencia leídos (y bloqueados) dentro de la transacción. */
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
    /** NO_ENCONTRADO se responde como 404; INVALIDO como 400. */
    readonly motivo: 'NO_ENCONTRADO' | 'INVALIDO' = 'INVALIDO',
  ) {
    super(mensaje);
    this.name = 'ErrorReglaPrestamo';
  }
}

/**
 * Valida que la referencia pueda prestarse: existe y está activa (si no, llega
 * `null`), es un implemento y tiene existencias suficientes.
 */
export function validarPrestamo(
  uniforme: UniformePrestable | null,
  cantidad: number,
): void {
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
}

/** Una pérdida o un daño exige una observación que lo justifique. */
export function validarRecepcion(recepcion: RecepcionSolicitada): void {
  if (recepcion.estado === 'PERDIDA_DANO' && !recepcion.observacion?.trim()) {
    throw new ErrorReglaPrestamo('Debes explicar la pérdida o el daño');
  }
}

/**
 * Unidades que vuelven al stock al cerrar el préstamo: todas si se devuelve,
 * ninguna si hubo pérdida o daño (no regresan automáticamente al inventario).
 */
export function unidadesQueRegresan(
  estado: RecepcionSolicitada['estado'],
  cantidad: number,
): number {
  return estado === 'DEVUELTO' ? cantidad : 0;
}
