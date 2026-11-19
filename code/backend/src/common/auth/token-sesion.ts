import { createHash, randomBytes } from 'node:crypto';
import type { CookieOptions } from 'express';

/** Cookie httpOnly con el token de la sesión (HU-M1-02). JavaScript del navegador no la lee. */
export const COOKIE_SESION = 'velora_sesion';

/** Duración de una sesión: una jornada de trabajo. */
export const DURACION_SESION_MS = 12 * 60 * 60 * 1000;

/** Token aleatorio de sesión. En la tabla sesion se guarda su SHA-256, nunca el token. */
export function crearTokenSesion(): { token: string; hash: string } {
  const token = randomBytes(32).toString('base64url');
  return { token, hash: hashTokenSesion(token) };
}

export function hashTokenSesion(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** Lee una cookie de la cabecera Cookie sin dependencias extra. */
export function leerCookie(cabecera: string | undefined, nombre: string): string | null {
  if (!cabecera) return null;
  for (const parte of cabecera.split(';')) {
    const igual = parte.indexOf('=');
    if (igual === -1) continue;
    if (parte.slice(0, igual).trim() !== nombre) continue;
    try {
      return decodeURIComponent(parte.slice(igual + 1).trim());
    } catch {
      return null;
    }
  }
  return null;
}

/** Opciones de la cookie: httpOnly, mismo sitio y, en producción, solo HTTPS. */
export function opcionesCookieSesion(): CookieOptions {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  };
}
