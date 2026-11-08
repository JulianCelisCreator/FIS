import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Rol, type UsuarioAutenticado } from '../../../common/auth/usuario-autenticado.js';
import {
  type ContextoPatinador,
  validarConsultaDePagos,
  validarGestionDePlan,
} from './acceso-patinador.validator.js';

const usuario = (id: number, ...roles: Rol[]): UsuarioAutenticado => ({ id, roles, permisos: [] });

const administrador = usuario(1, Rol.ADMINISTRADOR);
const contador = usuario(2, Rol.CONTADOR);
const acudiente = usuario(10, Rol.ACUDIENTE);
const otroAcudiente = usuario(11, Rol.ACUDIENTE);
const patinadorMenorUsuario = usuario(20, Rol.PATINADOR);
const patinadorMayorUsuario = usuario(21, Rol.PATINADOR);

const menor: ContextoPatinador = {
  id: 100,
  usuarioId: 20,
  activo: true,
  esMenor: true,
  acudienteIds: [10],
};
const mayor: ContextoPatinador = {
  id: 101,
  usuarioId: 21,
  activo: true,
  esMenor: false,
  acudienteIds: [],
};

describe('validarGestionDePlan', () => {
  it('permite al administrador, al acudiente del menor y al patinador mayor', () => {
    expect(() => validarGestionDePlan(administrador, menor)).not.toThrow();
    expect(() => validarGestionDePlan(acudiente, menor)).not.toThrow();
    expect(() => validarGestionDePlan(patinadorMayorUsuario, mayor)).not.toThrow();
  });

  it('impide que un menor gestione su propio plan', () => {
    expect(() => validarGestionDePlan(patinadorMenorUsuario, menor)).toThrow(
      /menor de edad no puede/,
    );
  });

  it('impide actuar sobre patinadores ajenos', () => {
    expect(() => validarGestionDePlan(otroAcudiente, menor)).toThrow(ForbiddenException);
    expect(() => validarGestionDePlan(patinadorMayorUsuario, menor)).toThrow(ForbiddenException);
    expect(() => validarGestionDePlan(contador, mayor)).toThrow(ForbiddenException);
  });

  it('exige acudiente asociado para un menor, incluso al administrador', () => {
    expect(() => validarGestionDePlan(administrador, { ...menor, acudienteIds: [] })).toThrow(
      'Asocia un acudiente antes de asignar un plan',
    );
  });

  it('rechaza patinadores inexistentes o inactivos', () => {
    expect(() => validarGestionDePlan(administrador, null)).toThrow(NotFoundException);
    expect(() => validarGestionDePlan(administrador, { ...mayor, activo: false })).toThrow(
      ConflictException,
    );
  });
});

describe('validarConsultaDePagos', () => {
  it('permite a administrador, contador, acudiente propio y patinador mayor', () => {
    expect(() => validarConsultaDePagos(administrador, menor)).not.toThrow();
    expect(() => validarConsultaDePagos(contador, menor)).not.toThrow();
    expect(() => validarConsultaDePagos(acudiente, menor)).not.toThrow();
    expect(() => validarConsultaDePagos(patinadorMayorUsuario, mayor)).not.toThrow();
  });

  it('oculta los pagos al menor y a usuarios ajenos', () => {
    expect(() => validarConsultaDePagos(patinadorMenorUsuario, menor)).toThrow(ForbiddenException);
    expect(() => validarConsultaDePagos(otroAcudiente, menor)).toThrow(ForbiddenException);
  });
});
