import { calcularEdad, motivosNoElegible, type ReglasCategoria } from './reglas-categoria.js';

const juvenil: ReglasCategoria = {
  nombre: 'Juvenil A', edadMinima: 14, edadMaxima: 17, genero: 'MIXTO', nivelMinimoOrden: 2, nivelMinimoNombre: 'Intermedio',
};

describe('calcularEdad', () => {
  it('cuenta años cumplidos, no el año de nacimiento', () => {
    expect(calcularEdad('2010-06-15', '2026-06-14')).toBe(15);
    expect(calcularEdad('2010-06-15', '2026-06-15')).toBe(16);
    expect(calcularEdad('2010-12-31', '2026-01-01')).toBe(15);
  });
});

describe('motivosNoElegible', () => {
  const hoy = '2026-11-24';

  it('no devuelve motivos cuando cumple edad, género y nivel', () => {
    expect(motivosNoElegible(juvenil, { fechaNacimiento: '2011-01-10', genero: 'FEMENINO', nivelActualOrden: 2 }, hoy)).toEqual([]);
  });

  it('rechaza por edad fuera del rango', () => {
    const motivos = motivosNoElegible(juvenil, { fechaNacimiento: '2018-01-10', genero: 'FEMENINO', nivelActualOrden: 3 }, hoy);
    expect(motivos).toHaveLength(1);
    expect(motivos[0]).toContain('14 a 17 años');
  });

  it('acepta edad máxima abierta', () => {
    const mayores = { ...juvenil, edadMinima: 18, edadMaxima: null };
    expect(motivosNoElegible(mayores, { fechaNacimiento: '1990-01-01', genero: 'MASCULINO', nivelActualOrden: 5 }, hoy)).toEqual([]);
  });

  it('rechaza por género distinto cuando la categoría no es mixta', () => {
    const femenina = { ...juvenil, genero: 'FEMENINO' as const };
    expect(motivosNoElegible(femenina, { fechaNacimiento: '2011-01-10', genero: 'MASCULINO', nivelActualOrden: 2 }, hoy)).toEqual([
      'La categoría Juvenil A es femenina',
    ]);
  });

  it('rechaza por nivel inferior al mínimo', () => {
    const motivos = motivosNoElegible(juvenil, { fechaNacimiento: '2011-01-10', genero: 'FEMENINO', nivelActualOrden: 1 }, hoy);
    expect(motivos).toEqual(['La categoría Juvenil A exige el nivel Intermedio o superior']);
  });

  it('exige un nivel registrado aunque la categoría no pida nivel mínimo', () => {
    const libre = { ...juvenil, nivelMinimoOrden: null, nivelMinimoNombre: null };
    expect(motivosNoElegible(libre, { fechaNacimiento: '2011-01-10', genero: 'FEMENINO', nivelActualOrden: null }, hoy)).toEqual([
      'El patinador aún no tiene un nivel registrado; evalúalo primero',
    ]);
  });

  it('acumula todos los motivos', () => {
    const femenina = { ...juvenil, genero: 'FEMENINO' as const };
    expect(motivosNoElegible(femenina, { fechaNacimiento: '2020-01-10', genero: 'MASCULINO', nivelActualOrden: 1 }, hoy)).toHaveLength(3);
  });
});
