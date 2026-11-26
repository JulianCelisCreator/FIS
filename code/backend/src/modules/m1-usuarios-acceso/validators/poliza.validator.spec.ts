import { Rol, type UsuarioAutenticado } from '../../../common/auth/usuario-autenticado.js';
import type { PatinadorConAutorizacion } from '../repositories/autorizaciones.repository.js';
import {
  MENSAJE_FECHAS_INVERTIDAS,
  MENSAJE_POLIZA_PATINADOR_INACTIVO,
  MENSAJE_POLIZA_SIN_ACUDIENTE,
  MENSAJE_POLIZA_SOLO_MENOR,
  MENSAJE_SIN_ACCESO_POLIZA,
  esFechaValida,
  validarConsultaPoliza,
  validarDatosPoliza,
  validarRegistroPoliza,
} from './poliza.validator.js';

const acudiente: UsuarioAutenticado = { id: 10, roles: [Rol.ACUDIENTE], permisos: [] };
const administrador: UsuarioAutenticado = { id: 1, roles: [Rol.ADMINISTRADOR], permisos: [] };
const profesor: UsuarioAutenticado = { id: 8, roles: [Rol.PROFESOR], permisos: [] };

const patinador = (): PatinadorConAutorizacion => ({
  id: 100,
  nombre: 'Sofía Ramírez',
  tipoDocumento: 'TI',
  numeroDocumento: '1023456789',
  edad: 9,
  esMenor: true,
  activo: true,
  acudientes: [
    { id: 10, nombre: 'Carolina Ramírez', parentesco: 'madre', esPrincipal: true },
  ],
  autorizacion: null,
  perfil: {
    estado: 'BLOQUEADO',
    tienePolizaVigente: false,
    requisitosFaltantes: ['AUTORIZACION', 'POLIZA'],
  },
});

describe('validarConsultaPoliza (HU-M1-10, privacidad M1)', () => {
  it('deja pasar al Administrador y al Acudiente vinculado', () => {
    expect(() => validarConsultaPoliza(administrador, patinador())).not.toThrow();
    expect(() => validarConsultaPoliza(acudiente, patinador())).not.toThrow();
  });

  it('rechaza a un usuario ajeno y a un patinador inexistente', () => {
    expect(() => validarConsultaPoliza(profesor, patinador())).toThrow(MENSAJE_SIN_ACCESO_POLIZA);
    expect(() => validarConsultaPoliza(administrador, null)).toThrow('El patinador no existe.');
  });
});

describe('validarRegistroPoliza (HU-M1-10, CA-04)', () => {
  it('exige un patinador menor, activo y con acudiente', () => {
    expect(() =>
      validarRegistroPoliza(acudiente, { ...patinador(), activo: false }),
    ).toThrow(MENSAJE_POLIZA_PATINADOR_INACTIVO);
    expect(() =>
      validarRegistroPoliza(acudiente, { ...patinador(), esMenor: false }),
    ).toThrow(MENSAJE_POLIZA_SOLO_MENOR);
    expect(() =>
      validarRegistroPoliza(administrador, { ...patinador(), acudientes: [] }),
    ).toThrow(MENSAJE_POLIZA_SIN_ACUDIENTE);
  });
});

describe('validarDatosPoliza (HU-M1-10, CA-02)', () => {
  it('acepta fechas reales en orden y recorta los textos', () => {
    expect(
      validarDatosPoliza({
        aseguradora: ' Sura ',
        numeroPoliza: ' POL-882341 ',
        vigenteDesde: '2026-01-01',
        vigenteHasta: '2026-12-31',
      }),
    ).toEqual({
      aseguradora: 'Sura',
      numeroPoliza: 'POL-882341',
      vigenteDesde: '2026-01-01',
      vigenteHasta: '2026-12-31',
    });
  });

  it('rechaza una fecha que no existe en el calendario', () => {
    expect(esFechaValida('2026-02-31')).toBe(false);
    expect(esFechaValida('2026-02-28')).toBe(true);
  });

  it('rechaza una fecha de fin anterior a la de inicio', () => {
    expect(() =>
      validarDatosPoliza({
        aseguradora: 'Sura',
        numeroPoliza: 'POL-1',
        vigenteDesde: '2026-12-31',
        vigenteHasta: '2026-01-01',
      }),
    ).toThrow(MENSAJE_FECHAS_INVERTIDAS);
  });
});
