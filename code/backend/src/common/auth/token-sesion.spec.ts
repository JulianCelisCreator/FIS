import { crearTokenSesion, hashTokenSesion, leerCookie } from './token-sesion.js';

describe('token de sesión', () => {
  it('guarda solo el hash del token', () => {
    const { token, hash } = crearTokenSesion();
    expect(hash).toBe(hashTokenSesion(token));
    expect(hash).not.toContain(token);
    expect(token.length).toBeGreaterThanOrEqual(43);
  });

  it('genera tokens distintos', () => {
    expect(crearTokenSesion().token).not.toBe(crearTokenSesion().token);
  });
});

describe('leerCookie', () => {
  it('encuentra la cookie entre varias', () => {
    expect(leerCookie('a=1; velora_sesion=x%2Dy; b=2', 'velora_sesion')).toBe('x-y');
  });

  it('devuelve null si no está o la cabecera falta', () => {
    expect(leerCookie('a=1', 'velora_sesion')).toBeNull();
    expect(leerCookie(undefined, 'velora_sesion')).toBeNull();
  });
});
