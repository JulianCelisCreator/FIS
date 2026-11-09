// Reglas de negocio de la venta de uniformes (HU-6.7 / RF-M6-07), sin acceso a
// base de datos para poder probarlas de forma aislada.

export interface ItemSolicitado {
  uniformeId: number;
  cantidad: number;
}

/** Datos de la referencia leídos (y bloqueados) dentro de la transacción. */
export interface UniformeVendible {
  id: number;
  referencia: string;
  talla: string;
  tipo: string;
  precioVenta: number;
  cantidadDisponible: number;
  activo: boolean;
}

export interface LineaVenta {
  uniformeId: number;
  referencia: string;
  talla: string;
  cantidad: number;
  valorUnitario: number;
  subtotal: number;
}

/** Tipos de inventario que se venden; los implementos solo se prestan (HU-6.8). */
export const TIPOS_VENDIBLES = ['CAMISETA', 'CHAQUETA', 'PANTALON', 'UNIFORME_COMPLETO'];

export class ErrorReglaVenta extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = 'ErrorReglaVenta';
  }
}

/** Une las líneas repetidas de una misma referencia sumando sus cantidades. */
export function consolidarItems(items: ItemSolicitado[]): ItemSolicitado[] {
  const porUniforme = new Map<number, number>();
  for (const item of items) {
    porUniforme.set(item.uniformeId, (porUniforme.get(item.uniformeId) ?? 0) + item.cantidad);
  }
  return [...porUniforme.entries()]
    .map(([uniformeId, cantidad]) => ({ uniformeId, cantidad }))
    .sort((a, b) => a.uniformeId - b.uniformeId);
}

/**
 * Valida cada línea contra el inventario y calcula valores. Bloquea la venta si
 * la referencia no existe, está inactiva, no es vendible, no tiene precio o si
 * la cantidad supera las existencias (criterio 3 de HU-6.7).
 */
export function construirLineas(
  items: ItemSolicitado[],
  uniformes: UniformeVendible[],
): { lineas: LineaVenta[]; total: number } {
  const porId = new Map(uniformes.map((uniforme) => [uniforme.id, uniforme]));
  const lineas = consolidarItems(items).map((item) => {
    const uniforme = porId.get(item.uniformeId);
    if (!uniforme || !uniforme.activo) {
      throw new ErrorReglaVenta(`La referencia ${item.uniformeId} no existe o está desactivada`);
    }
    if (!TIPOS_VENDIBLES.includes(uniforme.tipo)) {
      throw new ErrorReglaVenta(`${uniforme.referencia} es un implemento de préstamo y no se vende`);
    }
    if (!(uniforme.precioVenta > 0)) {
      throw new ErrorReglaVenta(`${uniforme.referencia} no tiene precio de venta registrado`);
    }
    if (item.cantidad > uniforme.cantidadDisponible) {
      throw new ErrorReglaVenta(
        `Existencias insuficientes para ${uniforme.referencia} talla ${uniforme.talla}: ` +
          `se solicitan ${item.cantidad} y solo hay ${uniforme.cantidadDisponible} disponibles`,
      );
    }
    return {
      uniformeId: uniforme.id,
      referencia: uniforme.referencia,
      talla: uniforme.talla,
      cantidad: item.cantidad,
      valorUnitario: uniforme.precioVenta,
      subtotal: redondearPesos(uniforme.precioVenta * item.cantidad),
    };
  });
  const total = redondearPesos(lineas.reduce((suma, linea) => suma + linea.subtotal, 0));
  return { lineas, total };
}

/** Descripción corta del cobro en M5: «Venta de uniformes: CAMISETA-OFICIAL (M) x2, …». */
export function describirVenta(lineas: LineaVenta[]): string {
  const texto = lineas.map((linea) => `${linea.referencia} (${linea.talla}) x${linea.cantidad}`).join(', ');
  const descripcion = `Venta de uniformes: ${texto}`;
  return descripcion.length > 500 ? `${descripcion.slice(0, 497)}...` : descripcion;
}

function redondearPesos(valor: number): number {
  return Math.round(valor * 100) / 100;
}
