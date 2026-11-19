import { ForbiddenException, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Roles } from './decoradores.js';
import { MENSAJE_SIN_ROL, RolesGuard } from './roles.guard.js';
import { Rol, type UsuarioAutenticado } from './usuario-autenticado.js';

class ControladorDeAdministrador {
  @Roles(Rol.ADMINISTRADOR)
  soloAdministrador() {}

  @Roles(Rol.ADMINISTRADOR, Rol.PROFESOR)
  administradorOProfesor() {}

  libre() {}
}

function contexto(
  metodo: keyof ControladorDeAdministrador,
  usuario?: Partial<UsuarioAutenticado>,
): ExecutionContext {
  return {
    getHandler: () => ControladorDeAdministrador.prototype[metodo],
    getClass: () => ControladorDeAdministrador,
    switchToHttp: () => ({
      getRequest: () => ({ usuario: usuario && { id: 1, permisos: [], ...usuario } }),
    }),
  } as unknown as ExecutionContext;
}

describe('RolesGuard (HU-M1-07)', () => {
  const guard = new RolesGuard(new Reflector());

  it('deja pasar al usuario que tiene el rol exigido', () => {
    expect(guard.canActivate(contexto('soloAdministrador', { roles: [Rol.ADMINISTRADOR] }))).toBe(true);
  });

  it('deja pasar si tiene cualquiera de los roles exigidos', () => {
    expect(guard.canActivate(contexto('administradorOProfesor', { roles: [Rol.PROFESOR] }))).toBe(true);
  });

  it('deja pasar a quien tiene varios roles si uno de ellos sirve', () => {
    const usuario = { roles: [Rol.PATINADOR, Rol.ADMINISTRADOR] };
    expect(guard.canActivate(contexto('soloAdministrador', usuario))).toBe(true);
  });

  it.each([Rol.PROFESOR, Rol.PATINADOR, Rol.ACUDIENTE, Rol.CONTADOR, Rol.VISITANTE])(
    'responde 403 al rol %s en una ruta solo de Administrador',
    (rol) => {
      const intento = () => guard.canActivate(contexto('soloAdministrador', { roles: [rol] }));

      expect(intento).toThrow(new ForbiddenException(MENSAJE_SIN_ROL));
    },
  );

  it('responde 403 si no hay usuario en la solicitud', () => {
    expect(() => guard.canActivate(contexto('soloAdministrador'))).toThrow(ForbiddenException);
  });

  it('responde 403 al usuario sin roles', () => {
    expect(() => guard.canActivate(contexto('soloAdministrador', { roles: [] }))).toThrow(ForbiddenException);
  });

  it('no restringe las rutas que no declaran @Roles', () => {
    expect(guard.canActivate(contexto('libre', { roles: [Rol.PATINADOR] }))).toBe(true);
  });
});