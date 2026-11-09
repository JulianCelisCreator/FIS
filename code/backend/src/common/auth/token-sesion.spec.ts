import { crearTokenSesion, hashTokenSesion, leerCookie, rolDelToken } from './token-sesion.js';
import { Rol } from './usuario-autenticado.js';

describe('token de sesión', () => {
  it('lleva el rol y guarda solo el hash', () => {
    const { token, hash } = crearTokenSesion(Rol.ACUDIENTE);
    expect(token.startsWith('ACUDIENTE.')).toBe(true);
    expect(hash).toBe(hashTokenSesion(token));
    expect(hash).not.toContain(token.split('.')[1]);
    expect(rolDelToken(token)).toBe(Rol.ACUDIENTE);
  });

  it('cambiar el rol del token cambia su hash', () => {
    const { token, hash } = crearTokenSesion(Rol.PATINADOR);
    const alterado = token.replace('PATINADOR.', 'ADMINISTRADOR.');
    expect(rolDelToken(alterado)).toBe(Rol.ADMINISTRADOR);
    expect(hashTokenSesion(alterado)).not.toBe(hash);
  });

  it('genera tokens distintos', () => {
    expect(crearTokenSesion(Rol.VISITANTE).token).not.toBe(crearTokenSesion(Rol.VISITANTE).token);
  });

  it('rechaza tokens sin rol válido', () => {
    expect(rolDelToken('sinpunto')).toBeNull();
    expect(rolDelToken('.secreto')).toBeNull();
    expect(rolDelToken('JEFE.secreto')).toBeNull();
    expect(rolDelToken('ACUDIENTE.')).toBeNull();
  });
});

describe('leerCookie', () => {
  it('encuentra la cookie entre varias', () => {
    expect(leerCookie('a=1; velora_sesion=ROL.x%2Dy; b=2', 'velora_sesion')).toBe('ROL.x-y');
  });

  it('devuelve null si no está o la cabecera falta', () => {
    expect(leerCookie('a=1', 'velora_sesion')).toBeNull();
    expect(leerCookie(undefined, 'velora_sesion')).toBeNull();
  });
});
