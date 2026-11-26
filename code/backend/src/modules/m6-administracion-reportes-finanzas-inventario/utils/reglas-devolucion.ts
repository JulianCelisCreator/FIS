// Reglas de la devolución de una venta de uniformes (HU-6.7 / RF-M6-07), sin
// acceso a base de datos para poder probarlas de forma aislada.
import { ErrorReglaVenta } from './reglas-venta.js';

/** Línea vendida con lo que ya se devolvió antes. */
export interface LineaVendida {
  uniformeId: number;
  referencia: string;
  talla: string;
  cantidad: number;
  valorUnitario: number;
  devuelto: number;
}

export interface ItemDevolucion {
  uniformeId: number;
  cantidad: number;
}

export interface LineaDevolucion {
  uniformeId: number;
  referencia: string;
  talla: string;
  cantidad: number;
  valorUnitario: number;
  subtotal: number;
}

export interface PlanDevolucion {
  lineas: LineaDevolucion[];
  valorDevuelto: number;
  /** Con esta devolución ya no quedan unidades por devolver. */
  completa: boolean;
  /**
   * Se anula el pago en M5 solo si esta devolución cubre la venta entera de una
   * vez (sin devoluciones previas): así el ingreso no se descuenta dos veces.
   */
  anulaPago: boolean;
}

/**
 * Valida las cantidades a devolver contra lo vendido y lo ya devuelto, y arma
 * las líneas al valor unitario de la venta.
 */
export function planearDevolucion(vendidas: LineaVendida[], items: ItemDevolucion[]): PlanDevolucion {
  if (items.length === 0) {
    throw new ErrorReglaVenta('Indica al menos una referencia a devolver');
  }
  const pedidas = new Map<number, number>();
  for (const item of items) {
    if (!Number.isInteger(item.cantidad) || item.cantidad < 1) {
      throw new ErrorReglaVenta('Cada cantidad a devolver debe ser un entero mayor que cero');
    }
    pedidas.set(item.uniformeId, (pedidas.get(item.uniformeId) ?? 0) + item.cantidad);
  }

  const lineas: LineaDevolucion[] = [];
  for (const [uniformeId, cantidad] of pedidas) {
    const vendida = vendidas.find((linea) => linea.uniformeId === uniformeId);
    if (!vendida) {
      throw new ErrorReglaVenta('Una de las referencias no pertenece a esta venta');
    }
    const pendiente = vendida.cantidad - vendida.devuelto;
    if (cantidad > pendiente) {
      throw new ErrorReglaVenta(
        `Solo quedan ${pendiente} unidad${pendiente === 1 ? '' : 'es'} de ${vendida.referencia} ` +
          `talla ${vendida.talla} por devolver`,
      );
    }
    lineas.push({
      uniformeId,
      referencia: vendida.referencia,
      talla: vendida.talla,
      cantidad,
      valorUnitario: vendida.valorUnitario,
      subtotal: Math.round(cantidad * vendida.valorUnitario * 100) / 100,
    });
  }

  const valorDevuelto = Math.round(lineas.reduce((suma, linea) => suma + linea.subtotal, 0) * 100) / 100;
  const completa = vendidas.every(
    (linea) => linea.cantidad - linea.devuelto === (pedidas.get(linea.uniformeId) ?? 0),
  );
  const sinPrevias = vendidas.every((linea) => linea.devuelto === 0);
  return { lineas, valorDevuelto, completa, anulaPago: completa && sinPrevias };
}
