import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import {
  Rol,
  type UsuarioAutenticado,
} from '../../../common/auth/usuario-autenticado.js';
import type { PatinadorConAutorizacion } from '../repositories/autorizaciones.repository.js';
import {
  MENSAJE_ACUDIENTE_AJENO,
  MENSAJE_ACUDIENTE_PROPIO,
  MENSAJE_PATINADOR_INACTIVO,
  MENSAJE_SIN_ACCESO,
  MENSAJE_SIN_ACUDIENTE,
  MENSAJE_SOLO_MENOR,
  MENSAJE_YA_REGISTRADA,
  validarConsultaAutorizacion,
  validarRegistroAutorizacion,
} from './autorizacion.validator.js';

const usuario = (id: number, ...roles: Rol[]): UsuarioAutenticado => ({
  id,
  roles,
  permisos: [],
});

const administrador = usuario(1, Rol.ADMINISTRADOR);
const acudiente = usuario(10, Rol.ACUDIENTE);
const otroAcudiente = usuario(11, Rol.ACUDIENTE);
const patinador = usuario(20, Rol.PATINADOR);

const ficha = (
  cambios: Partial<PatinadorConAutorizacion> = {},
): PatinadorConAutorizacion => ({
  id: 100,
  nombre: 'Sofía Ramírez',
  tipoDocumento: 'TI',
  numeroDocumento: '1023456789',
  edad: 12,
  esMenor: true,
  activo: true,
  acudientes: [
    {
      id: 10,
      nombre: 'Carolina Torres',
      parentesco: 'madre',
      esPrincipal: true,
    },
  ],
  autorizacion: null,
  perfil: {
    estado: 'BLOQUEADO',
    tienePolizaVigente: false,
    requisitosFaltantes: ['AUTORIZACION', 'POLIZA'],
  },
  ...cambios,
});

describe('validarConsultaAutorizacion (HU-M1-09)', () => {
  it('permite al Administrador y al acudiente vinculado', () => {
    expect(() =>
      validarConsultaAutorizacion(administrador, ficha()),
    ).not.toThrow();
    expect(() => validarConsultaAutorizacion(acudiente, ficha())).not.toThrow();
  });

  it('CA-04 y privacidad: oculta la ficha a otros acudientes y a un patinador', () => {
    expect(() => validarConsultaAutorizacion(otroAcudiente, ficha())).toThrow(
      new ForbiddenException(MENSAJE_SIN_ACCESO),
    );
    expect(() => validarConsultaAutorizacion(patinador, ficha())).toThrow(
      ForbiddenException,
    );
  });

  it('rechaza un patinador inexistente', () => {
    expect(() => validarConsultaAutorizacion(administrador, null)).toThrow(
      NotFoundException,
    );
  });
});

describe('validarRegistroAutorizacion (HU-M1-09)', () => {
  it('CA-01: un acudiente vinculado registra a su nombre', () => {
    expect(validarRegistroAutorizacion(acudiente, ficha())).toEqual({
      acudienteId: 10,
    });
  });

  it('CA-01: el Administrador puede registrar en nombre del acudiente indicado', () => {
    const fichaConDos = ficha({
      acudientes: [
        {
          id: 10,
          nombre: 'Carolina Torres',
          parentesco: 'madre',
          esPrincipal: true,
        },
        {
          id: 11,
          nombre: 'Luis Herrera',
          parentesco: 'padre',
          esPrincipal: false,
        },
      ],
    });
    expect(validarRegistroAutorizacion(administrador, fichaConDos, 11)).toEqual(
      {
        acudienteId: 11,
      },
    );
  });

  it('CA-01: sin acudiente indicado, el Administrador usa el principal', () => {
    const fichaConDos = ficha({
      acudientes: [
        {
          id: 11,
          nombre: 'Luis Herrera',
          parentesco: 'padre',
          esPrincipal: false,
        },
        {
          id: 10,
          nombre: 'Carolina Torres',
          parentesco: 'madre',
          esPrincipal: true,
        },
      ],
    });
    expect(validarRegistroAutorizacion(administrador, fichaConDos)).toEqual({
      acudienteId: 10,
    });
  });

  it('CA-05: impide registrar si el patinador no es menor', () => {
    expect(() =>
      validarRegistroAutorizacion(
        administrador,
        ficha({ esMenor: false, edad: 22, acudientes: [] }),
      ),
    ).toThrow(new ConflictException(MENSAJE_SOLO_MENOR));
  });

  it('CA-05: impide registrar si el acudiente no está vinculado', () => {
    expect(() => validarRegistroAutorizacion(otroAcudiente, ficha())).toThrow(
      new ForbiddenException(MENSAJE_SIN_ACCESO),
    );
  });

  it('CA-05: impide registrar si el menor no tiene acudiente', () => {
    expect(() =>
      validarRegistroAutorizacion(administrador, ficha({ acudientes: [] })),
    ).toThrow(new ConflictException(MENSAJE_SIN_ACUDIENTE));
  });

  it('CA-01: la autorización no se edita ni se registra dos veces', () => {
    expect(() =>
      validarRegistroAutorizacion(
        acudiente,
        ficha({
          autorizacion: {
            id: 1,
            fechaAutorizacion: '2026-11-18',
            registradaEn: '2026-11-18T15:00:00.000Z',
            versionTexto: 'v1',
            acudiente: { id: 10, nombre: 'Carolina Torres' },
          },
        }),
      ),
    ).toThrow(new ConflictException(MENSAJE_YA_REGISTRADA));
  });

  it('CA-05: impide registrar en un patinador inactivo', () => {
    expect(() =>
      validarRegistroAutorizacion(administrador, ficha({ activo: false })),
    ).toThrow(new ConflictException(MENSAJE_PATINADOR_INACTIVO));
  });

  it('un acudiente no puede atribuir la autorización a otra persona', () => {
    expect(() => validarRegistroAutorizacion(acudiente, ficha(), 11)).toThrow(
      new ForbiddenException(MENSAJE_ACUDIENTE_PROPIO),
    );
  });

  it('el Administrador no puede elegir un acudiente ajeno al vínculo', () => {
    expect(() =>
      validarRegistroAutorizacion(administrador, ficha(), 99),
    ).toThrow(new BadRequestException(MENSAJE_ACUDIENTE_AJENO));
  });
});
