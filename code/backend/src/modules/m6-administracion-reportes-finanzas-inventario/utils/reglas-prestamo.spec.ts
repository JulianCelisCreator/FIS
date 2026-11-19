import {
  calcularCobroPrestamo,
  ErrorReglaPrestamo,
  unidadesQueRegresan,
  validarPrestamo,
  validarRecepcion,
  type UniformePrestable,
} from './reglas-prestamo.js';

const casco: UniformePrestable = { tipo: 'IMPLEMENTO', cantidadDisponible: 3 };
const camiseta: UniformePrestable = {
  tipo: 'CAMISETA',
  cantidadDisponible: 10,
};

function errorDe(accion: () => void): ErrorReglaPrestamo {
  try {
    accion();
  } catch (error) {
    if (error instanceof ErrorReglaPrestamo) return error;
    throw error;
  }
  throw new Error('Se esperaba un ErrorReglaPrestamo');
}

describe('validarPrestamo', () => {
  it('permite prestar un implemento con existencias suficientes', () => {
    expect(() => validarPrestamo(casco, 3)).not.toThrow();
  });

  it('responde "no encontrado" si la referencia no existe o está inactiva', () => {
    const error = errorDe(() => validarPrestamo(null, 1));
    expect(error.motivo).toBe('NO_ENCONTRADO');
  });

  it.each(['CAMISETA', 'CHAQUETA', 'PANTALON', 'UNIFORME_COMPLETO'])(
    'bloquea el préstamo de prendas (%s)',
    (tipo) => {
      const error = errorDe(() => validarPrestamo({ ...camiseta, tipo }, 1));
      expect(error.motivo).toBe('INVALIDO');
      expect(error.message).toMatch(/Solo se pueden prestar implementos/);
    },
  );

  it('bloquea el préstamo si la cantidad supera las existencias', () => {
    const error = errorDe(() => validarPrestamo(casco, 4));
    expect(error.message).toMatch(/cantidad suficiente/);
  });

  it.each([0, -1, 1.5])('rechaza cantidades no válidas (%s)', (cantidad) => {
    expect(() => validarPrestamo(casco, cantidad)).toThrow(ErrorReglaPrestamo);
  });
});

describe('validarRecepcion', () => {
  it('acepta una devolución sin observación', () => {
    expect(() => validarRecepcion({ estado: 'DEVUELTO' })).not.toThrow();
  });

  it.each([undefined, '', '   '])(
    'exige observación para pérdida o daño (%j)',
    (observacion) => {
      expect(() =>
        validarRecepcion({ estado: 'PERDIDA_DANO', observacion }),
      ).toThrow(/explicar la pérdida o el daño/);
    },
  );

  it('acepta pérdida o daño con observación', () => {
    expect(() =>
      validarRecepcion({
        estado: 'PERDIDA_DANO',
        observacion: 'Casco roto en entrenamiento',
      }),
    ).not.toThrow();
  });
});

describe('calcularCobroPrestamo', () => {
  it('cobra tarifa × cantidad × días previstos', () => {
    expect(calcularCobroPrestamo(10000, 2, '2026-11-11', '2026-11-16')).toEqual({
      dias: 5,
      valor: 100000,
    });
  });

  it('cobra al menos un día si se devuelve el mismo día', () => {
    expect(calcularCobroPrestamo(5000, 1, '2026-11-11', '2026-11-11')).toEqual({
      dias: 1,
      valor: 5000,
    });
  });

  it('cruza meses sin errores', () => {
    expect(calcularCobroPrestamo(2000, 3, '2026-11-28', '2026-12-03').dias).toBe(5);
  });

  it('tarifa cero no genera valor', () => {
    expect(calcularCobroPrestamo(0, 4, '2026-11-11', '2026-11-20').valor).toBe(0);
  });

  it('rechaza tarifa negativa y fechas invertidas', () => {
    expect(() => calcularCobroPrestamo(-1, 1, '2026-11-11', '2026-11-12')).toThrow(/tarifa/);
    expect(() => calcularCobroPrestamo(1000, 1, '2026-11-11', '2026-11-10')).toThrow(
      /hoy o posterior/,
    );
  });
});

describe('unidadesQueRegresan', () => {
  it('la devolución reintegra todas las unidades al stock', () => {
    expect(unidadesQueRegresan('DEVUELTO', 2)).toBe(2);
  });

  it('la pérdida o el daño no reintegran unidades', () => {
    expect(unidadesQueRegresan('PERDIDA_DANO', 2)).toBe(0);
  });
});
