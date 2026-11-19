import { generarContrasenaTemporal, LONGITUD_CONTRASENA_TEMPORAL } from './contrasena-temporal.js';

describe('generarContrasenaTemporal', () => {
  it('tiene la longitud esperada, una letra y un dígito, y solo caracteres no ambiguos', () => {
    for (let i = 0; i < 200; i++) {
      const clave = generarContrasenaTemporal();
      expect(clave).toHaveLength(LONGITUD_CONTRASENA_TEMPORAL);
      expect(clave).toMatch(/[a-zA-Z]/);
      expect(clave).toMatch(/\d/);
      expect(clave).not.toMatch(/[0O1lI]/);
    }
  });

  it('no repite contraseñas', () => {
    const claves = new Set(Array.from({ length: 500 }, () => generarContrasenaTemporal()));
    expect(claves.size).toBe(500);
  });
});
