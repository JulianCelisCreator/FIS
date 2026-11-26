import {
  ErrorReglaPersonal,
  mensajeDuplicado,
  normalizarPersonal,
  validarCuentaVinculable,
} from './reglas-personal.js';

describe('normalizarPersonal', () => {
  it('limpia espacios, documento, correo y teléfono', () => {
    expect(
      normalizarPersonal({
        numeroDocumento: ' ab-123 ',
        nombres: '  Ana   María ',
        apellidos: ' Pérez  Gómez',
        correo: ' Ana.Perez@Club.CO ',
        telefono: '310 555 1234',
      }),
    ).toEqual({
      numeroDocumento: 'AB-123',
      nombres: 'Ana María',
      apellidos: 'Pérez Gómez',
      correo: 'ana.perez@club.co',
      telefono: '3105551234',
    });
  });

  it('no agrega campos que no vienen (edición parcial)', () => {
    expect(normalizarPersonal({ telefono: '300 111 2222' })).toEqual({
      telefono: '3001112222',
    });
  });

  it('rechaza nombres que quedan vacíos', () => {
    expect(() => normalizarPersonal({ nombres: '   ' })).toThrow(
      /nombres no pueden quedar vacíos/,
    );
  });
});

describe('mensajeDuplicado', () => {
  it.each([
    ['personal_tipo_documento_numero_documento_key', /documento/],
    ['personal_correo_uk', /correo/],
    ['personal_usuario_id_key', /cuenta/],
  ])('indica el campo duplicado (%s)', (constraint, patron) => {
    expect(mensajeDuplicado({ code: '23505', constraint })).toMatch(patron);
  });

  it('ignora otros errores', () => {
    expect(mensajeDuplicado({ code: '23514', constraint: 'personal_correo_uk' })).toBeNull();
    expect(mensajeDuplicado({ code: '23505', constraint: 'otra_tabla_key' })).toBeNull();
    expect(mensajeDuplicado(new Error('x'))).toBeNull();
  });
});

describe('validarCuentaVinculable', () => {
  it('acepta una cuenta activa sin vincular', () => {
    expect(() =>
      validarCuentaVinculable({ id: 5, estado: 'ACTIVA', personalId: null }, null),
    ).not.toThrow();
  });

  it('acepta la cuenta que ya tiene la misma persona', () => {
    expect(() =>
      validarCuentaVinculable({ id: 5, estado: 'ACTIVA', personalId: 7 }, 7),
    ).not.toThrow();
  });

  it('responde "no encontrado" si la cuenta no existe', () => {
    try {
      validarCuentaVinculable(null, null);
      expect.unreachable();
    } catch (error) {
      expect((error as ErrorReglaPersonal).motivo).toBe('NO_ENCONTRADO');
    }
  });

  it('rechaza cuentas desactivadas', () => {
    expect(() =>
      validarCuentaVinculable({ id: 5, estado: 'DESACTIVADA', personalId: null }, null),
    ).toThrow(/desactivada/);
  });

  it('rechaza cuentas de otra persona', () => {
    expect(() =>
      validarCuentaVinculable({ id: 5, estado: 'ACTIVA', personalId: 2 }, 7),
    ).toThrow(/otra persona/);
  });
});
