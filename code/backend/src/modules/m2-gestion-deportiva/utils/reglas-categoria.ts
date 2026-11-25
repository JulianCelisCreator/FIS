/** Reglas puras de elegibilidad de un patinador para una categoría (RF-M2-08, RF-M2-09, RF-M2-16). */

export type GeneroPatinador = 'FEMENINO' | 'MASCULINO';
export type GeneroCategoria = GeneroPatinador | 'MIXTO';

export interface ReglasCategoria {
  nombre: string;
  edadMinima: number;
  edadMaxima: number | null;
  genero: GeneroCategoria;
  /** Orden del nivel mínimo exigido; null si la categoría no exige nivel. */
  nivelMinimoOrden: number | null;
  nivelMinimoNombre: string | null;
}

export interface DatosPatinador {
  fechaNacimiento: string;
  genero: GeneroPatinador;
  /** Orden del nivel vigente; null si el patinador aún no tiene nivel registrado. */
  nivelActualOrden: number | null;
}

/** Años cumplidos a la fecha `hoy` (ambas 'YYYY-MM-DD'). */
export function calcularEdad(fechaNacimiento: string, hoy: string): number {
  const [anioN, mesN, diaN] = fechaNacimiento.split('-').map(Number);
  const [anio, mes, dia] = hoy.split('-').map(Number);
  let edad = anio - anioN;
  if (mes < mesN || (mes === mesN && dia < diaN)) edad -= 1;
  return edad;
}

const SIN_NIVEL = 'El patinador aún no tiene un nivel registrado; evalúalo primero';

/**
 * Lista, en español, lo que impide asignar al patinador a la categoría.
 * Lista vacía = el patinador cumple edad, género y nivel mínimo.
 */
export function motivosNoElegible(categoria: ReglasCategoria, patinador: DatosPatinador, hoy: string): string[] {
  const motivos: string[] = [];
  const edad = calcularEdad(patinador.fechaNacimiento, hoy);
  if (edad < categoria.edadMinima || (categoria.edadMaxima !== null && edad > categoria.edadMaxima)) {
    const rango = categoria.edadMaxima === null
      ? `${categoria.edadMinima} años o más`
      : `${categoria.edadMinima} a ${categoria.edadMaxima} años`;
    motivos.push(`La categoría ${categoria.nombre} es para ${rango} y el patinador tiene ${edad}`);
  }
  if (categoria.genero !== 'MIXTO' && categoria.genero !== patinador.genero) {
    motivos.push(`La categoría ${categoria.nombre} es ${categoria.genero === 'FEMENINO' ? 'femenina' : 'masculina'}`);
  }
  if (patinador.nivelActualOrden === null) {
    motivos.push(SIN_NIVEL);
  } else if (categoria.nivelMinimoOrden !== null && patinador.nivelActualOrden < categoria.nivelMinimoOrden) {
    motivos.push(`La categoría ${categoria.nombre} exige el nivel ${categoria.nivelMinimoNombre ?? categoria.nivelMinimoOrden} o superior`);
  }
  return motivos;
}
