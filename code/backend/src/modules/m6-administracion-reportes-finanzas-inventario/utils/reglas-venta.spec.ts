import {
  construirLineas,
  consolidarItems,
  describirVenta,
  ErrorReglaVenta,
  type UniformeVendible,
} from './reglas-venta.js';

const camiseta: UniformeVendible = {
  id: 1,
  referencia: 'CAMISETA-OFICIAL',
  talla: 'M',
  tipo: 'CAMISETA',
  precioVenta: 55000,
  cantidadDisponible: 14,
  activo: true,
};
const chaqueta: UniformeVendible = {
  id: 2,
  referencia: 'CHAQUETA-CLUB',
  talla: 'S',
  tipo: 'CHAQUETA',
  precioVenta: 125000,
  cantidadDisponible: 1,
  activo: true,
};
const casco: UniformeVendible = {
  id: 4,
  referencia: 'CASCO-PATINAJE',
  talla: 'M',
  tipo: 'IMPLEMENTO',
  precioVenta: 0,
  cantidadDisponible: 6,
  activo: true,
};

describe('reglas de venta de uniformes (HU-6.7)', () => {
  it('une líneas repetidas de la misma referencia', () => {
    expect(
      consolidarItems([
        { uniformeId: 2, cantidad: 1 },
        { uniformeId: 1, cantidad: 2 },
        { uniformeId: 2, cantidad: 3 },
      ]),
    ).toEqual([
      { uniformeId: 1, cantidad: 2 },
      { uniformeId: 2, cantidad: 4 },
    ]);
  });

  it('calcula subtotales y total con el precio de venta vigente', () => {
    const { lineas, total } = construirLineas(
      [
        { uniformeId: 1, cantidad: 2 },
        { uniformeId: 2, cantidad: 1 },
      ],
      [camiseta, chaqueta],
    );
    expect(lineas).toEqual([
      { uniformeId: 1, referencia: 'CAMISETA-OFICIAL', talla: 'M', cantidad: 2, valorUnitario: 55000, subtotal: 110000 },
      { uniformeId: 2, referencia: 'CHAQUETA-CLUB', talla: 'S', cantidad: 1, valorUnitario: 125000, subtotal: 125000 },
    ]);
    expect(total).toBe(235000);
  });

  it('bloquea la venta cuando la cantidad supera las existencias', () => {
    expect(() => construirLineas([{ uniformeId: 2, cantidad: 2 }], [chaqueta])).toThrow(
      /se solicitan 2 y solo hay 1 disponibles/,
    );
  });

  it('bloquea cuando la suma de líneas repetidas supera las existencias', () => {
    expect(() =>
      construirLineas(
        [
          { uniformeId: 2, cantidad: 1 },
          { uniformeId: 2, cantidad: 1 },
        ],
        [chaqueta],
      ),
    ).toThrow(ErrorReglaVenta);
  });

  it('no vende implementos de préstamo', () => {
    expect(() => construirLineas([{ uniformeId: 4, cantidad: 1 }], [casco])).toThrow(/no se vende/);
  });

  it('no vende referencias inexistentes o desactivadas', () => {
    expect(() => construirLineas([{ uniformeId: 99, cantidad: 1 }], [camiseta])).toThrow(/no existe/);
    expect(() =>
      construirLineas([{ uniformeId: 1, cantidad: 1 }], [{ ...camiseta, activo: false }]),
    ).toThrow(/desactivada/);
  });

  it('no vende referencias sin precio de venta', () => {
    expect(() =>
      construirLineas([{ uniformeId: 1, cantidad: 1 }], [{ ...camiseta, precioVenta: 0 }]),
    ).toThrow(/precio de venta/);
  });

  it('describe la venta para el cobro de M5', () => {
    const { lineas } = construirLineas([{ uniformeId: 1, cantidad: 2 }], [camiseta]);
    expect(describirVenta(lineas)).toBe('Venta de uniformes: CAMISETA-OFICIAL (M) x2');
  });
});
