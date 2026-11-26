// Política de contraseñas de M1 (HU-M1-08, decisión del equipo): al menos 8
// caracteres, una mayúscula, una minúscula y un número. Se aplica a toda
// contraseña que la persona define (recuperación y cambio desde la cuenta);
// la contraseña temporal que genera el sistema (HU-M1-01) sigue su propia regla.

export const LONGITUD_MINIMA = 8;
export const LONGITUD_MAXIMA = 128;

const REGLAS: { cumple: (contrasena: string) => boolean; falta: string }[] = [
  { cumple: (c) => c.length >= LONGITUD_MINIMA, falta: `Debe tener al menos ${LONGITUD_MINIMA} caracteres` },
  { cumple: (c) => /\p{Lu}/u.test(c), falta: 'Falta una mayúscula' },
  { cumple: (c) => /\p{Ll}/u.test(c), falta: 'Falta una minúscula' },
  { cumple: (c) => /\d/.test(c), falta: 'Falta un número' },
];

/**
 * HU-M1-08 CA-04: cada condición que falta, en el orden en que se muestran.
 * Vacío significa que la contraseña cumple la política.
 */
export function reglasIncumplidas(contrasena: string): string[] {
  if (contrasena.length > LONGITUD_MAXIMA) return [`No puede superar ${LONGITUD_MAXIMA} caracteres`];
  return REGLAS.filter((regla) => !regla.cumple(contrasena)).map((regla) => regla.falta);
}
