import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from 'node:crypto';

// Hash de contraseñas con scrypt (incluido en Node, sin dependencias nativas).
// Formato guardado en usuario.contrasena_hash:
//   scrypt$<N>$<r>$<p>$<sal base64>$<hash base64>
// Los parámetros viajan con el hash para poder subirlos después sin invalidar
// las contraseñas ya guardadas.

const N = 16384;
const R = 8;
const P = 1;
const LONGITUD_SAL = 16;
const LONGITUD_HASH = 64;
const PREFIJO = 'scrypt';

function derivar(contrasena: string, sal: Buffer, opciones: ScryptOptions, longitud: number): Promise<Buffer> {
  return new Promise((resolver, rechazar) => {
    scrypt(contrasena.normalize('NFKC'), sal, longitud, { ...opciones, maxmem: 64 * 1024 * 1024 }, (error, clave) =>
      error ? rechazar(error) : resolver(clave),
    );
  });
}

/** Devuelve el hash que se guarda en la base. Nunca guardar la contraseña en claro. */
export async function hashContrasena(contrasena: string): Promise<string> {
  const sal = randomBytes(LONGITUD_SAL);
  const hash = await derivar(contrasena, sal, { N, r: R, p: P }, LONGITUD_HASH);
  return [PREFIJO, N, R, P, sal.toString('base64'), hash.toString('base64')].join('$');
}

/** Compara en tiempo constante. Un hash con formato desconocido nunca coincide. */
export async function verificarContrasena(contrasena: string, guardado: string): Promise<boolean> {
  const partes = guardado.split('$');
  if (partes.length !== 6 || partes[0] !== PREFIJO) return false;
  const [n, r, p] = partes.slice(1, 4).map(Number);
  if (![n, r, p].every((valor) => Number.isInteger(valor) && valor > 0)) return false;

  const sal = Buffer.from(partes[4], 'base64');
  const esperado = Buffer.from(partes[5], 'base64');
  if (sal.length === 0 || esperado.length === 0) return false;

  const calculado = await derivar(contrasena, sal, { N: n, r, p }, esperado.length);
  return timingSafeEqual(calculado, esperado);
}
