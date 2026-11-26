import { reglasIncumplidas } from './politica-contrasena.js';

describe('reglasIncumplidas (HU-M1-08 CA-04)', () => {
  it('acepta una contraseña que cumple todas las reglas', () => {
    expect(reglasIncumplidas('Patines2026')).toEqual([]);
    expect(reglasIncumplidas('Ñandú2026x')).toEqual([]);
  });

  it('dice cada condición que falta, no solo que hay un error', () => {
    expect(reglasIncumplidas('patines2026')).toEqual(['Falta una mayúscula']);
    expect(reglasIncumplidas('PATINES2026')).toEqual(['Falta una minúscula']);
    expect(reglasIncumplidas('Patinesss')).toEqual(['Falta un número']);
    expect(reglasIncumplidas('Ab1')).toEqual(['Debe tener al menos 8 caracteres']);
    expect(reglasIncumplidas('')).toEqual([
      'Debe tener al menos 8 caracteres',
      'Falta una mayúscula',
      'Falta una minúscula',
      'Falta un número',
    ]);
  });

  it('rechaza contraseñas demasiado largas', () => {
    expect(reglasIncumplidas(`Aa1${'x'.repeat(130)}`)).toEqual(['No puede superar 128 caracteres']);
  });
});
