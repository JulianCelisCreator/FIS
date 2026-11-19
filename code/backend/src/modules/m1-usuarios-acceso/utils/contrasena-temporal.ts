import { randomInt } from 'node:crypto';

// Sin caracteres que se confunden al dictarlos o copiarlos a mano (0/O, 1/l/I).
const LETRAS = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ';
const DIGITOS = '23456789';
const ALFABETO = LETRAS + DIGITOS;

export const LONGITUD_CONTRASENA_TEMPORAL = 12;

/**
 * Contraseña temporal aleatoria para una cuenta nueva (HU-M1-01, decisión del
 * equipo: el sistema la genera y el Administrador la entrega una sola vez).
 * Siempre tiene al menos una letra y un dígito.
 */
export function generarContrasenaTemporal(longitud = LONGITUD_CONTRASENA_TEMPORAL): string {
  const caracteres = [LETRAS[randomInt(LETRAS.length)], DIGITOS[randomInt(DIGITOS.length)]];
  while (caracteres.length < longitud) caracteres.push(ALFABETO[randomInt(ALFABETO.length)]);
  // Fisher–Yates para que la letra y el dígito garantizados no queden siempre al inicio.
  for (let i = caracteres.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [caracteres[i], caracteres[j]] = [caracteres[j], caracteres[i]];
  }
  return caracteres.join('');
}
