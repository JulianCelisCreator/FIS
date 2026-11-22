import { ErrorReglaVenta } from './reglas-venta.js';
import { planearDevolucion, type LineaVendida } from './reglas-devolucion.js';

const camisetas: LineaVendida = {
  uniformeId: 1,
  referencia: 'CAMISETA-OFICIAL',
  talla: 'M',
  cantidad: 3,
  valorUnitario: 55000,
  devuelto: 0,
};
const chaqueta: LineaVendida = {
  uniformeId: 2,
  referencia: 'CHAQUETA-CLUB',
  talla: 'S',
  cantidad: 1,
  valorUnitario: 125000,
  devuelto: 0,
};

describe('planearDevolucion', () => {
  it('devolución parcial: valor al precio de la venta, sin anular el pago', () => {
    const plan = planearDevolucion([camisetas, chaqueta], [{ uniformeId: 1, cantidad: 2 }]);
    expect(plan.valorDevuelto).toBe(110000);
    expect(plan.completa).toBe(false);
    expect(plan.anulaPago).toBe(false);
    expect(plan.lineas).toEqual([
      expect.objectContaining({ uniformeId: 1, cantidad: 2, subtotal: 110000 }),
    ]);
  });

  it('devolución total de una vez: anula el pago en M5', () => {
    const plan = planearDevolucion(
      [camisetas, chaqueta],
      [
        { uniformeId: 1, cantidad: 3 },
        { uniformeId: 2, cantidad: 1 },
      ],
    );
    expect(plan.valorDevuelto).toBe(290000);
    expect(plan.completa).toBe(true);
    expect(plan.anulaPago).toBe(true);
  });

  it('completar una venta con devoluciones previas no anula el pago (no se descuenta dos veces)', () => {
    const plan = planearDevolucion(
      [{ ...camisetas, devuelto: 2 }, chaqueta],
      [
        { uniformeId: 1, cantidad: 1 },
        { uniformeId: 2, cantidad: 1 },
      ],
    );
    expect(plan.completa).toBe(true);
    expect(plan.anulaPago).toBe(false);
    expect(plan.valorDevuelto).toBe(180000);
  });

  it('suma las líneas repetidas antes de validar', () => {
    expect(() =>
      planearDevolucion(
        [camisetas],
        [
          { uniformeId: 1, cantidad: 2 },
          { uniformeId: 1, cantidad: 2 },
        ],
      ),
    ).toThrow(/Solo quedan 3 unidades/);
  });

  it('no deja devolver más de lo que queda pendiente', () => {
    expect(() =>
      planearDevolucion([{ ...camisetas, devuelto: 3 }], [{ uniformeId: 1, cantidad: 1 }]),
    ).toThrow(/Solo quedan 0 unidades/);
  });

  it('rechaza referencias que no están en la venta, cantidades no válidas y listas vacías', () => {
    expect(() => planearDevolucion([camisetas], [{ uniformeId: 9, cantidad: 1 }])).toThrow(
      /no pertenece/,
    );
    expect(() => planearDevolucion([camisetas], [{ uniformeId: 1, cantidad: 0 }])).toThrow(
      ErrorReglaVenta,
    );
    expect(() => planearDevolucion([camisetas], [])).toThrow(/al menos una/);
  });
});
