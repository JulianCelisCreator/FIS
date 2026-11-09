import { createHash, randomBytes } from 'node:crypto';
import type { CookieOptions } from 'express';
import { Rol } from './usuario-autenticado.js';

/** Cookie httpOnly con el token de la sesión (RF-M1-02). JavaScript del navegador no la lee. */
export const COOKIE_SESION = 'velora_sesion';

/** Duración de una sesión: una jornada de trabajo. */
export const DURACION_SESION_MS = 12 * 60 * 60 * 1000;

const ROLES = new Set<string>(Object.values(Rol));

/**
 * Token de sesión: `<ROL>.<secreto aleatorio>`. En la tabla sesion se guarda
 * el SHA-256 del token completo, nunca el token. Como el rol es parte de lo que
 * se hashea, cambiar el rol en la cookie hace que deje de coincidir: el rol con
 * el que se ingresó no se puede alterar desde el navegador.
 */
export function crearTokenSesion(rol: Rol): { token: string; hash: string } {
  const token = `${rol}.${randomBytes(32).toString('base64url')}`;
  return { token, hash: hashTokenSesion(token) };
}

export function hashTokenSesion(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** Rol que declara el token, o null si el formato no es válido. */
export function rolDelToken(token: string): Rol | null {
  const punto = token.indexOf('.');
  if (punto <= 0 || punto === token.length - 1) return null;
  const rol = token.slice(0, punto);
  return ROLES.has(rol) ? (rol as Rol) : null;
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
